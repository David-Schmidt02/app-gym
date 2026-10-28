from datetime import date

from fastapi import APIRouter, Query, status

from app.dependencies import DbDep
from app.schemas.hoy import HoyOut
from app.schemas.planes import PlanOut
from app.schemas.sesiones import EntrenamientoOut, SesionIn, SesionOut
from app.services.agenda_service import AgendaService
from app.services.sesion_service import SesionService

router = APIRouter(tags=["Entrenamientos"])


@router.get("/hoy", response_model=HoyOut)
def hoy(db: DbDep) -> HoyOut:
    servicio = SesionService(db)
    agenda = AgendaService(db)
    plan = servicio.planes.activo()
    semana = agenda.semana_actual(plan) if plan and plan.dias else None
    sugerido: int | None = None
    if plan and plan.dias and semana is not None:
        sugerido = agenda.dia_sugerido(plan, semana, servicio.dia_sugerido(plan))
    return HoyOut(
        ciclo=servicio.ciclo.estado(),
        plan=PlanOut.model_validate(plan) if plan else None,
        dia_sugerido=sugerido,
        sesiones_semana=servicio.de_la_semana(),
        semana=semana,
    )


@router.get("/entrenar/{dia_orden}", response_model=EntrenamientoOut)
def entrenar(dia_orden: int, db: DbDep, plan_id: int | None = None) -> EntrenamientoOut:
    return SesionService(db).entrenamiento(dia_orden, plan_id)


@router.get("/sesiones", response_model=list[SesionOut])
def listar(db: DbDep, limite: int = Query(30, ge=1, le=200), antes_de: date | None = None) -> list[SesionOut]:
    return [SesionOut.model_validate(s) for s in SesionService(db).listar(limite, antes_de)]


@router.post("/sesiones", response_model=SesionOut, status_code=status.HTTP_201_CREATED)
def crear(datos: SesionIn, db: DbDep) -> SesionOut:
    return SesionOut.model_validate(SesionService(db).crear(datos))


@router.get("/sesiones/{sesion_id}", response_model=SesionOut)
def obtener(sesion_id: int, db: DbDep) -> SesionOut:
    return SesionOut.model_validate(SesionService(db).obtener(sesion_id))


@router.put("/sesiones/{sesion_id}", response_model=SesionOut)
def reemplazar(sesion_id: int, datos: SesionIn, db: DbDep) -> SesionOut:
    return SesionOut.model_validate(SesionService(db).reemplazar(sesion_id, datos))


@router.delete("/sesiones/{sesion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(sesion_id: int, db: DbDep) -> None:
    SesionService(db).eliminar(sesion_id)
