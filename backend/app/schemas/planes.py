from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.ejercicios import EjercicioOut


class EjercicioDelDiaIn(BaseModel):
    ejercicio_id: int
    series: int = Field(default=3, ge=1, le=10)


class DiaIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=40)
    dia_semana: int | None = Field(default=None, ge=0, le=6)
    ejercicios: list[EjercicioDelDiaIn] = Field(max_length=15)


class PlanIn(BaseModel):
    """El plan completo: guardar reemplaza sus días y ejercicios por estos."""

    nombre: str = Field(min_length=1, max_length=60)
    descripcion: str | None = Field(default=None, max_length=300)
    descanso_dias: int = Field(default=1, ge=0, le=3)
    dias: list[DiaIn] = Field(min_length=1, max_length=7)

    @model_validator(mode="after")
    def _validar_calendario(self) -> "PlanIn":
        asignados = [d.dia_semana for d in self.dias if d.dia_semana is not None]
        if not asignados:
            return self
        if len(asignados) != len(self.dias):
            raise ValueError("Asigná un día de la semana a todos los días de la rutina o dejala libre")
        if len(set(asignados)) != len(asignados):
            raise ValueError("Dos días de la rutina no pueden compartir el mismo día de la semana")
        return self


class EjercicioDelDiaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ejercicio: EjercicioOut
    series: int


class DiaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    orden: int
    nombre: str
    dia_semana: int | None
    ejercicios: list[EjercicioDelDiaOut]


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    activo: bool
    descanso_dias: int
    dias: list[DiaOut]
