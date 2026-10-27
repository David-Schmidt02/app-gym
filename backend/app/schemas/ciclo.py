from datetime import date

from pydantic import BaseModel, Field

from app.models import TipoSemana


class CicloOut(BaseModel):
    """Semana 0 = adaptación; después bloques de 5: semanas 1 a 4 de progresión y la 5 de descarga."""

    semana: int
    tipo: TipoSemana
    bloque: int
    semana_del_bloque: int
    inicio_semana: date
    proxima_descarga: date | None


class CicloIn(BaseModel):
    semana: int = Field(ge=0, le=520, description="Semana en la que estás ahora (0 = adaptación)")
