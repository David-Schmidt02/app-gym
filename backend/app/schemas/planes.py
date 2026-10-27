from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ejercicios import EjercicioOut


class EjercicioDelDiaIn(BaseModel):
    ejercicio_id: int
    series: int = Field(default=3, ge=1, le=10)


class DiaIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=40)
    ejercicios: list[EjercicioDelDiaIn] = Field(max_length=15)


class PlanIn(BaseModel):
    """El plan completo: guardar reemplaza sus días y ejercicios por estos."""

    nombre: str = Field(min_length=1, max_length=60)
    descripcion: str | None = Field(default=None, max_length=300)
    dias: list[DiaIn] = Field(min_length=1, max_length=7)


class EjercicioDelDiaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ejercicio: EjercicioOut
    series: int


class DiaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    orden: int
    nombre: str
    ejercicios: list[EjercicioDelDiaOut]


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    activo: bool
    dias: list[DiaOut]
