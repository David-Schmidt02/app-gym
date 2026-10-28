from fastapi import APIRouter

from app.dependencies import DbDep
from app.schemas.agenda import AgendaMoverIn, SemanaOut
from app.services.agenda_service import AgendaService

router = APIRouter(prefix="/agenda", tags=["Agenda"])


@router.put("/dia", response_model=SemanaOut)
def mover_dia(datos: AgendaMoverIn, db: DbDep) -> SemanaOut:
    return AgendaService(db).mover_dia(datos)


@router.delete("/semana", response_model=SemanaOut)
def restaurar_semana(db: DbDep) -> SemanaOut:
    return AgendaService(db).restaurar_semana()
