from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

EstadoCasillero = Literal["hecho", "pendiente", "descanso"]
EstadoHoy = Literal["entrenar", "hecho", "descanso", "libre"]


class AgendaMoverIn(BaseModel):
    """Mueve un día pendiente a otra fecha de la semana actual o lo saltea si fecha es None."""

    dia_orden: int = Field(ge=0, le=6)
    fecha: date | None = None
    cascada: bool = True


class DiaResumenOut(BaseModel):
    dia_orden: int
    dia_nombre: str


class ProximoDiaOut(BaseModel):
    dia_orden: int
    dia_nombre: str
    fecha: date


class DiaAgendaOut(BaseModel):
    fecha: date
    dia_semana: int
    es_hoy: bool
    estado: EstadoCasillero
    dia_orden: int | None = None
    dia_nombre: str | None = None
    sesion_id: int | None = None
    reprogramado: bool = False
    fecha_original: date | None = None


class SemanaOut(BaseModel):
    inicio: date
    fin: date
    tiene_calendario: bool
    descanso_dias: int
    estado_hoy: EstadoHoy
    dia_hoy: int | None = None
    proximo_dia: ProximoDiaOut | None = None
    modificada: bool = False
    dias: list[DiaAgendaOut]
    salteados: list[DiaResumenOut] = Field(default_factory=list)
    sin_lugar: list[DiaResumenOut] = Field(default_factory=list)
