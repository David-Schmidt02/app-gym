from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.exceptions import NoEncontrado, ReglaDeNegocio
from app.core.fechas import hoy, lunes
from app.models import AgendaDia, DiaPlan, Plan, Sesion
from app.schemas.agenda import (
    AgendaMoverIn,
    DiaAgendaOut,
    DiaResumenOut,
    EstadoHoy,
    ProximoDiaOut,
    SemanaOut,
)
from app.services.plan_service import PlanService


@dataclass(frozen=True)
class _Pendiente:
    orden: int
    nombre: str
    fecha_plantilla: date
    deseada: date
    fijado_manual: bool


def tiene_calendario(plan: Plan) -> bool:
    """Indica si todos los días de la rutina tienen un día fijo de la semana asignado."""
    return bool(plan.dias) and all(d.dia_semana is not None for d in plan.dias)


class AgendaService:
    """Resuelve y reprograma la semana activa combinando plantilla, sesiones hechas y ajustes."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.planes = PlanService(db)

    def semana_actual(self, plan: Plan) -> SemanaOut:
        hoy_fecha = hoy()
        inicio = lunes(hoy_fecha)
        fin = inicio + timedelta(days=6)
        sesiones = self._sesiones_rango(inicio, fin)
        por_fecha: dict[date, list[Sesion]] = {}
        for s in sesiones:
            por_fecha.setdefault(s.fecha, []).append(s)

        if not tiene_calendario(plan):
            return self._semana_libre(plan, hoy_fecha, inicio, fin, por_fecha)

        hechos_plan: dict[int, Sesion] = {}
        for s in sesiones:
            if s.plan_id == plan.id and s.dia_orden is not None and s.dia_orden not in hechos_plan:
                hechos_plan[s.dia_orden] = s

        ajustes = self._ajustes_semana(inicio, plan.id)
        ajustes_activos = {a.dia_orden: a.fecha for a in ajustes if a.dia_orden not in hechos_plan}

        salteados = [
            DiaResumenOut(dia_orden=d.orden, dia_nombre=d.nombre)
            for d in plan.dias
            if d.orden in ajustes_activos and ajustes_activos[d.orden] is None
        ]

        ubicados, sin_lugar = self._ubicar_pendientes(
            plan=plan,
            hoy_fecha=hoy_fecha,
            inicio=inicio,
            sesiones=sesiones,
            hechos_plan=hechos_plan,
            ajustes_activos=ajustes_activos,
        )

        pendiente_por_fecha = {fecha: dia for dia, fecha in ubicados}
        dias_out: list[DiaAgendaOut] = []
        for idx in range(7):
            fecha_celda = inicio + timedelta(days=idx)
            hechas_celda = por_fecha.get(fecha_celda, [])
            if hechas_celda:
                ultima = hechas_celda[-1]
                dias_out.append(
                    DiaAgendaOut(
                        fecha=fecha_celda,
                        dia_semana=idx,
                        es_hoy=fecha_celda == hoy_fecha,
                        estado="hecho",
                        dia_orden=ultima.dia_orden,
                        dia_nombre=" + ".join(dict.fromkeys(s.dia_nombre for s in hechas_celda)),
                        sesion_id=ultima.id,
                    )
                )
            elif fecha_celda in pendiente_por_fecha:
                dia_plan = pendiente_por_fecha[fecha_celda]
                assert dia_plan.dia_semana is not None
                original = inicio + timedelta(days=dia_plan.dia_semana)
                dias_out.append(
                    DiaAgendaOut(
                        fecha=fecha_celda,
                        dia_semana=idx,
                        es_hoy=fecha_celda == hoy_fecha,
                        estado="pendiente",
                        dia_orden=dia_plan.orden,
                        dia_nombre=dia_plan.nombre,
                        reprogramado=fecha_celda != original,
                        fecha_original=original if fecha_celda != original else None,
                    )
                )
            else:
                dias_out.append(
                    DiaAgendaOut(
                        fecha=fecha_celda,
                        dia_semana=idx,
                        es_hoy=fecha_celda == hoy_fecha,
                        estado="descanso",
                    )
                )

        celda_hoy = dias_out[(hoy_fecha - inicio).days]
        estado_hoy: EstadoHoy
        dia_hoy: int | None = None
        if celda_hoy.estado == "hecho":
            estado_hoy = "hecho"
        elif celda_hoy.estado == "pendiente":
            estado_hoy = "entrenar"
            dia_hoy = celda_hoy.dia_orden
        else:
            estado_hoy = "descanso"

        futuros = [
            ProximoDiaOut(dia_orden=c.dia_orden, dia_nombre=c.dia_nombre or "", fecha=c.fecha)
            for c in dias_out
            if c.estado == "pendiente" and c.dia_orden is not None and c.fecha > hoy_fecha
        ]

        return SemanaOut(
            inicio=inicio,
            fin=fin,
            tiene_calendario=True,
            descanso_dias=plan.descanso_dias,
            estado_hoy=estado_hoy,
            dia_hoy=dia_hoy,
            proximo_dia=futuros[0] if futuros else None,
            modificada=bool(ajustes_activos),
            dias=dias_out,
            salteados=salteados,
            sin_lugar=sin_lugar,
        )

    def dia_sugerido(self, plan: Plan, semana: SemanaOut, fallback_cola: int) -> int:
        """Devuelve el día de hoy si toca entrenar, el próximo pendiente de la semana o la cola."""
        if semana.dia_hoy is not None:
            return semana.dia_hoy
        if semana.proximo_dia is not None:
            return semana.proximo_dia.dia_orden
        if semana.sin_lugar:
            return semana.sin_lugar[0].dia_orden
        return fallback_cola

    def mover_dia(self, datos: AgendaMoverIn) -> SemanaOut:
        plan = self._plan_con_calendario()
        if not 0 <= datos.dia_orden < len(plan.dias):
            raise NoEncontrado("La rutina no tiene ese día")

        hoy_fecha = hoy()
        inicio = lunes(hoy_fecha)
        fin = inicio + timedelta(days=6)
        sesiones = self._sesiones_rango(inicio, fin)
        if any(s.plan_id == plan.id and s.dia_orden == datos.dia_orden for s in sesiones):
            raise ReglaDeNegocio("Ese día ya fue entrenado esta semana")

        if datos.fecha is not None:
            if not inicio <= datos.fecha <= fin:
                raise ReglaDeNegocio("Solo se puede reprogramar dentro de la semana actual")
            if datos.fecha < hoy_fecha:
                raise ReglaDeNegocio("No se puede mover un entrenamiento a un día que ya pasó")
            if any(s.fecha == datos.fecha for s in sesiones):
                raise ReglaDeNegocio("Ya hay un entrenamiento registrado en ese día")

            # Libera colisiones directas y, si es en cascada, recalcula los días posteriores
            dia_actual = plan.dias[datos.dia_orden]
            assert dia_actual.dia_semana is not None
            for existente in self._ajustes_semana(inicio, plan.id):
                if existente.dia_orden == datos.dia_orden or existente.fecha is None:
                    continue
                otro_dia = plan.dias[existente.dia_orden] if existente.dia_orden < len(plan.dias) else None
                es_posterior = (
                    otro_dia is not None
                    and otro_dia.dia_semana is not None
                    and otro_dia.dia_semana > dia_actual.dia_semana
                )
                if existente.fecha == datos.fecha or (datos.cascada and es_posterior):
                    self.db.delete(existente)

        fila = self.db.scalar(
            select(AgendaDia).where(
                AgendaDia.semana == inicio,
                AgendaDia.plan_id == plan.id,
                AgendaDia.dia_orden == datos.dia_orden,
            )
        )
        if fila is None:
            self.db.add(AgendaDia(semana=inicio, plan_id=plan.id, dia_orden=datos.dia_orden, fecha=datos.fecha))
        else:
            fila.fecha = datos.fecha
        self.db.commit()
        return self.semana_actual(plan)

    def restaurar_semana(self) -> SemanaOut:
        plan = self._plan_con_calendario()
        inicio = lunes(hoy())
        self.db.execute(delete(AgendaDia).where(AgendaDia.semana == inicio, AgendaDia.plan_id == plan.id))
        self.db.commit()
        return self.semana_actual(plan)

    def _plan_con_calendario(self) -> Plan:
        plan = self.planes.activo()
        if plan is None:
            raise ReglaDeNegocio("No hay una rutina activa")
        if not tiene_calendario(plan):
            raise ReglaDeNegocio("Asigná días de la semana a la rutina antes de reprogramar")
        return plan

    def _sesiones_rango(self, inicio: date, fin: date) -> list[Sesion]:
        return list(
            self.db.scalars(
                select(Sesion)
                .where(Sesion.fecha >= inicio, Sesion.fecha <= fin)
                .order_by(Sesion.fecha.asc(), Sesion.id.asc())
            )
        )

    def _ajustes_semana(self, inicio: date, plan_id: int) -> list[AgendaDia]:
        return list(
            self.db.scalars(select(AgendaDia).where(AgendaDia.semana == inicio, AgendaDia.plan_id == plan_id))
        )

    def _semana_libre(
        self, plan: Plan, hoy_fecha: date, inicio: date, fin: date, por_fecha: dict[date, list[Sesion]]
    ) -> SemanaOut:
        dias_out: list[DiaAgendaOut] = []
        for idx in range(7):
            fecha_celda = inicio + timedelta(days=idx)
            hechas = por_fecha.get(fecha_celda, [])
            if hechas:
                ultima = hechas[-1]
                dias_out.append(
                    DiaAgendaOut(
                        fecha=fecha_celda,
                        dia_semana=idx,
                        es_hoy=fecha_celda == hoy_fecha,
                        estado="hecho",
                        dia_orden=ultima.dia_orden,
                        dia_nombre=" + ".join(dict.fromkeys(s.dia_nombre for s in hechas)),
                        sesion_id=ultima.id,
                    )
                )
            else:
                dias_out.append(
                    DiaAgendaOut(
                        fecha=fecha_celda,
                        dia_semana=idx,
                        es_hoy=fecha_celda == hoy_fecha,
                        estado="descanso",
                    )
                )
        return SemanaOut(
            inicio=inicio,
            fin=fin,
            tiene_calendario=False,
            descanso_dias=plan.descanso_dias,
            estado_hoy="hecho" if hoy_fecha in por_fecha else "libre",
            dias=dias_out,
        )

    def _ubicar_pendientes(
        self,
        plan: Plan,
        hoy_fecha: date,
        inicio: date,
        sesiones: list[Sesion],
        hechos_plan: dict[int, Sesion],
        ajustes_activos: dict[int, date | None],
    ) -> tuple[list[tuple[DiaPlan, date]], list[DiaResumenOut]]:
        por_orden = {d.orden: d for d in plan.dias}
        ocupadas = {s.fecha for s in sesiones}
        todos_dias = [inicio + timedelta(days=i) for i in range(7)]

        items: list[_Pendiente] = []
        for d in plan.dias:
            if d.orden in hechos_plan:
                continue
            if d.orden in ajustes_activos and ajustes_activos[d.orden] is None:
                continue
            assert d.dia_semana is not None
            plantilla = inicio + timedelta(days=d.dia_semana)
            ajuste_fecha = ajustes_activos.get(d.orden)
            fijado = ajuste_fecha is not None and ajuste_fecha >= hoy_fecha and ajuste_fecha not in ocupadas
            deseada = ajuste_fecha if ajuste_fecha is not None else plantilla
            items.append(
                _Pendiente(
                    orden=d.orden,
                    nombre=d.nombre,
                    fecha_plantilla=plantilla,
                    deseada=deseada,
                    fijado_manual=fijado,
                )
            )

        items.sort(key=lambda x: (x.deseada, not x.fijado_manual, x.orden))

        reservadas_manual: dict[int, date] = {}
        fechas_manuales: set[date] = set()
        for item in items:
            if item.fijado_manual and item.deseada not in fechas_manuales:
                reservadas_manual[item.orden] = item.deseada
                fechas_manuales.add(item.deseada)

        hechas_con_plantilla = [
            (s.fecha, inicio + timedelta(days=por_orden[s.dia_orden].dia_semana))
            for s in sesiones
            if s.plan_id == plan.id and s.dia_orden in por_orden and por_orden[s.dia_orden].dia_semana is not None
        ]
        prev_fecha: date | None = None
        prev_plantilla: date | None = None
        if hechas_con_plantilla:
            prev_fecha, prev_plantilla = max(hechas_con_plantilla, key=lambda par: par[0])

        ubicados: list[tuple[DiaPlan, date]] = []
        sin_lugar: list[DiaResumenOut] = []

        for idx, item in enumerate(items):
            if item.orden in reservadas_manual:
                elegida = reservadas_manual[item.orden]
                ocupadas.add(elegida)
                ubicados.append((por_orden[item.orden], elegida))
                if prev_fecha is None or elegida >= prev_fecha:
                    prev_fecha, prev_plantilla = elegida, item.fecha_plantilla
                continue

            libres = [d for d in todos_dias if d >= hoy_fecha and d not in ocupadas and d not in fechas_manuales]
            posteriores = [d for d in libres if prev_fecha is None or d > prev_fecha]
            candidatos = posteriores or libres
            if not candidatos:
                sin_lugar.append(DiaResumenOut(dia_orden=item.orden, dia_nombre=item.nombre))
                continue

            restantes = sum(1 for x in items[idx + 1 :] if x.orden not in reservadas_manual)
            tope = candidatos[max(0, len(candidatos) - 1 - restantes)]

            minima = max(hoy_fecha, item.deseada)
            if prev_fecha is not None and prev_plantilla is not None and prev_fecha > prev_plantilla:
                minima = max(minima, prev_fecha + timedelta(days=plan.descanso_dias + 1))

            objetivo = min(minima, tope)
            elegida = next((d for d in candidatos if d >= objetivo), candidatos[-1])
            ocupadas.add(elegida)
            ubicados.append((por_orden[item.orden], elegida))
            prev_fecha, prev_plantilla = elegida, item.fecha_plantilla

        return ubicados, sin_lugar
