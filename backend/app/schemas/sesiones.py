from datetime import date
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from app.models import TipoSemana
from app.schemas.ejercicios import EjercicioOut



class SerieIn(BaseModel):
    ejercicio_id: int
    peso_kg: float = Field(ge=0, le=1000)
    reps: int = Field(ge=0, le=100)


class SesionIn(BaseModel):
    fecha: date
    plan_id: int | None = None
    dia_orden: int | None = None
    dia_nombre: str = Field(min_length=1, max_length=40)
    notas: str | None = Field(default=None, max_length=500)
    series: list[SerieIn] = Field(min_length=1, max_length=120)


class SerieOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ejercicio_id: int
    peso_kg: float
    reps: int


class SesionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fecha: date
    plan_id: int | None
    dia_orden: int | None
    dia_nombre: str
    tipo_semana: TipoSemana
    notas: str | None
    series: list[SerieOut]


class Accion(StrEnum):
    PRIMERA = "primera"
    SUBIR = "subir"
    MANTENER = "mantener"
    BAJAR = "bajar"
    DESCARGA = "descarga"


class Sugerencia(BaseModel):
    """Lo que conviene hacer hoy en un ejercicio, con el motivo en palabras."""

    accion: Accion
    peso_kg: float | None
    series: int
    reps_min: int
    reps_max: int
    motivo: str


class UltimaVez(BaseModel):
    fecha: date
    series: list[SerieOut]


class EjercicioParaHoy(BaseModel):
    ejercicio: EjercicioOut
    series: int
    ultima_vez: UltimaVez | None
    sugerencia: Sugerencia


class EntrenamientoOut(BaseModel):
    plan_id: int
    dia_orden: int
    dia_nombre: str
    tipo_semana: TipoSemana
    ejercicios: list[EjercicioParaHoy]
