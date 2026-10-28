from pydantic import BaseModel

from app.schemas.agenda import SemanaOut
from app.schemas.ciclo import CicloOut
from app.schemas.planes import PlanOut


class HoyOut(BaseModel):
    ciclo: CicloOut
    plan: PlanOut | None
    dia_sugerido: int | None
    sesiones_semana: int
    semana: SemanaOut | None = None
