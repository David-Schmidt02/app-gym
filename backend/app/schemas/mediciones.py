from datetime import date
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

Kg = Annotated[float, Field(gt=0, le=400)]
Cm = Annotated[float, Field(gt=0, le=300)]
CAMPOS = ("peso_kg", "cintura_cm", "cadera_cm", "pecho_cm", "brazo_cm", "muslo_cm")


class MedicionIn(BaseModel):
    fecha: date
    peso_kg: Kg | None = None
    cintura_cm: Cm | None = None
    cadera_cm: Cm | None = None
    pecho_cm: Cm | None = None
    brazo_cm: Cm | None = None
    muslo_cm: Cm | None = None
    notas: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def _algo_medido(self) -> Self:
        if all(getattr(self, campo) is None for campo in CAMPOS):
            raise ValueError("Anotá al menos el peso o una medida")
        return self


class MedicionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fecha: date
    peso_kg: float | None
    cintura_cm: float | None
    cadera_cm: float | None
    pecho_cm: float | None
    brazo_cm: float | None
    muslo_cm: float | None
    notas: str | None
