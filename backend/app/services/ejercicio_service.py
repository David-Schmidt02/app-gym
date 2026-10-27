from itertools import groupby

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.core.exceptions import Conflicto, NoEncontrado, ReglaDeNegocio
from app.models import Ejercicio, EjercicioDelDia, Grupo, Serie, Sesion, TipoSemana
from app.schemas.ejercicios import EjercicioIn, EjercicioOut, EjercicioUpdate, ProgresoOut, PuntoProgreso


def uno_rm(peso: float, reps: int) -> float:
    """1RM estimado con la fórmula de Epley."""
    return round(peso * (1 + reps / 30), 1) if reps else peso


class EjercicioService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def listar(self) -> list[Ejercicio]:
        orden = {grupo: i for i, grupo in enumerate(Grupo)}
        ejercicios = self.db.scalars(select(Ejercicio).order_by(Ejercicio.nombre))
        return sorted(ejercicios, key=lambda e: orden[e.grupo])

    def obtener(self, ejercicio_id: int) -> Ejercicio:
        ejercicio = self.db.get(Ejercicio, ejercicio_id)
        if ejercicio is None:
            raise NoEncontrado("El ejercicio no existe")
        return ejercicio

    def crear(self, datos: EjercicioIn) -> Ejercicio:
        nombre = datos.nombre.strip()
        self._nombre_libre(nombre)
        ejercicio = Ejercicio(**datos.model_dump(exclude={"nombre", "notas"}), nombre=nombre, notas=_texto(datos.notas))
        self.db.add(ejercicio)
        self.db.commit()
        return ejercicio

    def actualizar(self, ejercicio_id: int, datos: EjercicioUpdate) -> Ejercicio:
        ejercicio = self.obtener(ejercicio_id)
        cambios = datos.model_dump(exclude_unset=True)
        if cambios.get("nombre"):
            cambios["nombre"] = cambios["nombre"].strip()
            self._nombre_libre(cambios["nombre"], ejercicio_id)
        if "notas" in cambios:
            cambios["notas"] = _texto(cambios["notas"])
        for campo, valor in cambios.items():
            if valor is not None or campo == "notas":
                setattr(ejercicio, campo, valor)
        if ejercicio.reps_min > ejercicio.reps_max:
            raise ReglaDeNegocio("El mínimo de repeticiones no puede superar al máximo")
        self.db.commit()
        return ejercicio

    def eliminar(self, ejercicio_id: int) -> None:
        ejercicio = self.obtener(ejercicio_id)
        if self.db.scalar(select(exists().where(Serie.ejercicio_id == ejercicio_id))):
            raise ReglaDeNegocio("Tiene entrenamientos guardados: archivalo para conservar el historial")
        if self.db.scalar(select(exists().where(EjercicioDelDia.ejercicio_id == ejercicio_id))):
            raise ReglaDeNegocio("Está en una rutina: sacalo de la rutina primero")
        self.db.delete(ejercicio)
        self.db.commit()

    def progreso(self, ejercicio_id: int) -> ProgresoOut:
        ejercicio = self.obtener(ejercicio_id)
        filas = self.db.execute(
            select(Sesion.id, Sesion.fecha, Sesion.tipo_semana, Serie.peso_kg, Serie.reps)
            .join(Serie, Serie.sesion_id == Sesion.id)
            .where(Serie.ejercicio_id == ejercicio_id)
            .order_by(Sesion.fecha, Sesion.id, Serie.orden)
        ).all()
        puntos = []
        for _sesion_id, grupo in groupby(filas, key=lambda f: f.id):
            series = list(grupo)
            peso = max(f.peso_kg for f in series)
            puntos.append(
                PuntoProgreso(
                    fecha=series[0].fecha,
                    peso_kg=peso,
                    reps=max(f.reps for f in series if f.peso_kg == peso),
                    uno_rm=max(uno_rm(f.peso_kg, f.reps) for f in series),
                    volumen=round(sum(f.peso_kg * f.reps for f in series), 1),
                    descarga=series[0].tipo_semana == TipoSemana.DESCARGA,
                )
            )
        normales = [p for p in puntos if not p.descarga]
        return ProgresoOut(
            ejercicio=EjercicioOut.model_validate(ejercicio),
            puntos=puntos,
            record_peso=max(normales, key=lambda p: (p.peso_kg, p.reps), default=None),
            record_uno_rm=max(normales, key=lambda p: p.uno_rm, default=None),
        )

    def _nombre_libre(self, nombre: str, propio_id: int | None = None) -> None:
        otro = self.db.scalar(select(Ejercicio).where(Ejercicio.nombre == nombre))
        if otro is not None and otro.id != propio_id:
            raise Conflicto(f"Ya existe «{nombre}»")


def _texto(valor: str | None) -> str | None:
    return (valor or "").strip() or None
