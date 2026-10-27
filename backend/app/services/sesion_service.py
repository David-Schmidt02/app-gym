from datetime import date, timedelta
from itertools import groupby

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NoEncontrado, ReglaDeNegocio
from app.core.fechas import hoy, lunes
from app.models import Ejercicio, Plan, Serie, Sesion, TipoSemana
from app.schemas.ejercicios import EjercicioOut
from app.schemas.sesiones import EjercicioParaHoy, EntrenamientoOut, SerieOut, SesionIn, UltimaVez
from app.services.ciclo_service import CicloService
from app.services.plan_service import PlanService
from app.services.progresion import sugerir

SESIONES_DE_HISTORIAL = 3  # las que mira la progresión para detectar un estancamiento


class SesionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.ciclo = CicloService(db)
        self.planes = PlanService(db)

    def listar(self, limite: int = 30, antes_de: date | None = None) -> list[Sesion]:
        consulta = select(Sesion).order_by(Sesion.fecha.desc(), Sesion.id.desc()).limit(limite)
        if antes_de:
            consulta = consulta.where(Sesion.fecha < antes_de)
        return list(self.db.scalars(consulta))

    def obtener(self, sesion_id: int) -> Sesion:
        sesion = self.db.get(Sesion, sesion_id)
        if sesion is None:
            raise NoEncontrado("El entrenamiento no existe")
        return sesion

    def crear(self, datos: SesionIn) -> Sesion:
        sesion = Sesion()
        self.db.add(sesion)
        self._volcar(sesion, datos)
        self.db.commit()
        return sesion

    def reemplazar(self, sesion_id: int, datos: SesionIn) -> Sesion:
        sesion = self.obtener(sesion_id)
        sesion.series.clear()
        self.db.flush()
        self._volcar(sesion, datos)
        self.db.commit()
        return sesion

    def eliminar(self, sesion_id: int) -> None:
        self.db.delete(self.obtener(sesion_id))
        self.db.commit()

    def de_la_semana(self) -> int:
        inicio = lunes(hoy())
        return self.db.scalar(
            select(func.count(Sesion.id)).where(Sesion.fecha >= inicio, Sesion.fecha < inicio + timedelta(days=7))
        )

    def dia_sugerido(self, plan: Plan) -> int:
        """El día que sigue al último entrenado de esta rutina (el primero si todavía no hay)."""
        ultimo = self.db.scalar(
            select(Sesion.dia_orden)
            .where(Sesion.plan_id == plan.id, Sesion.dia_orden.is_not(None))
            .order_by(Sesion.fecha.desc(), Sesion.id.desc())
            .limit(1)
        )
        return 0 if ultimo is None else (ultimo + 1) % len(plan.dias)

    def entrenamiento(self, dia_orden: int, plan_id: int | None = None) -> EntrenamientoOut:
        """Los ejercicios del día con lo hecho la vez pasada y lo que conviene hacer hoy."""
        plan = self.planes.obtener(plan_id) if plan_id else self.planes.activo()
        if plan is None:
            raise ReglaDeNegocio("No hay una rutina activa")
        if not 0 <= dia_orden < len(plan.dias):
            raise NoEncontrado("La rutina no tiene ese día")
        dia = plan.dias[dia_orden]
        semana = self.ciclo.tipo_de(hoy())
        ejercicios = []
        for item in dia.ejercicios:
            historial = self._historial(item.ejercicio_id)
            ejercicios.append(
                EjercicioParaHoy(
                    ejercicio=EjercicioOut.model_validate(item.ejercicio),
                    series=item.series,
                    ultima_vez=historial[0] if historial else None,
                    sugerencia=sugerir(item.ejercicio, item.series, semana, [h.series for h in historial]),
                )
            )
        return EntrenamientoOut(
            plan_id=plan.id, dia_orden=dia_orden, dia_nombre=dia.nombre, tipo_semana=semana, ejercicios=ejercicios
        )

    def _historial(self, ejercicio_id: int) -> list[UltimaVez]:
        """Las últimas sesiones del ejercicio fuera de las descargas, la más reciente primero."""
        filas = self.db.execute(
            select(Sesion.id, Sesion.fecha, Serie.ejercicio_id, Serie.peso_kg, Serie.reps)
            .join(Serie, Serie.sesion_id == Sesion.id)
            .where(Serie.ejercicio_id == ejercicio_id, Sesion.tipo_semana != TipoSemana.DESCARGA)
            .order_by(Sesion.fecha.desc(), Sesion.id.desc(), Serie.orden)
            .limit(SESIONES_DE_HISTORIAL * 12)
        ).all()
        sesiones = [list(grupo) for _id, grupo in groupby(filas, key=lambda f: f.id)][:SESIONES_DE_HISTORIAL]
        return [
            UltimaVez(fecha=series[0].fecha, series=[SerieOut.model_validate(f, from_attributes=True) for f in series])
            for series in sesiones
        ]

    def _volcar(self, sesion: Sesion, datos: SesionIn) -> None:
        ids = {s.ejercicio_id for s in datos.series}
        existentes = set(self.db.scalars(select(Ejercicio.id).where(Ejercicio.id.in_(ids))))
        if faltan := ids - existentes:
            raise NoEncontrado(f"No existen los ejercicios {sorted(faltan)}")
        if datos.plan_id is not None:
            self.planes.obtener(datos.plan_id)
        sesion.fecha = datos.fecha
        sesion.plan_id = datos.plan_id
        sesion.dia_orden = datos.dia_orden
        sesion.dia_nombre = datos.dia_nombre.strip()
        sesion.notas = (datos.notas or "").strip() or None
        sesion.tipo_semana = self.ciclo.tipo_de(datos.fecha)
        sesion.series = [
            Serie(ejercicio_id=s.ejercicio_id, orden=i, peso_kg=s.peso_kg, reps=s.reps)
            for i, s in enumerate(datos.series)
        ]
