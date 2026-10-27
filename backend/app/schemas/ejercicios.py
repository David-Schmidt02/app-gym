from datetime import date
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models import Grupo, TipoEjercicio

Reps = Annotated[int, Field(ge=1, le=50)]


class EjercicioIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    grupo: Grupo
    tipo: TipoEjercicio
    reps_min: Reps
    reps_max: Reps
    incremento_kg: float = Field(gt=0, le=20)
    notas: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def _rango(self) -> Self:
        if self.reps_min > self.reps_max:
            raise ValueError("El mínimo de repeticiones no puede superar al máximo")
        return self


class EjercicioUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=80)
    grupo: Grupo | None = None
    tipo: TipoEjercicio | None = None
    reps_min: Reps | None = None
    reps_max: Reps | None = None
    incremento_kg: float | None = Field(default=None, gt=0, le=20)
    notas: str | None = Field(default=None, max_length=300)
    archivado: bool | None = None


class EjercicioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    grupo: Grupo
    tipo: TipoEjercicio
    reps_min: int
    reps_max: int
    incremento_kg: float
    notas: str | None
    archivado: bool


class PuntoProgreso(BaseModel):
    """Una sesión del ejercicio: el peso más alto, las reps a ese peso y el 1RM estimado (Epley)."""

    fecha: date
    peso_kg: float
    reps: int
    uno_rm: float
    volumen: float
    descarga: bool


class ProgresoOut(BaseModel):
    ejercicio: EjercicioOut
    puntos: list[PuntoProgreso]
    record_peso: PuntoProgreso | None
    record_uno_rm: PuntoProgreso | None
