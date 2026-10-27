from fastapi import APIRouter, status

from app.dependencies import DbDep
from app.schemas.planes import PlanIn, PlanOut
from app.services.plan_service import PlanService

router = APIRouter(prefix="/planes", tags=["Rutinas"])


@router.get("", response_model=list[PlanOut])
def listar(db: DbDep) -> list[PlanOut]:
    return [PlanOut.model_validate(p) for p in PlanService(db).listar()]


@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def crear(datos: PlanIn, db: DbDep) -> PlanOut:
    return PlanOut.model_validate(PlanService(db).crear(datos))


@router.put("/{plan_id}", response_model=PlanOut)
def reemplazar(plan_id: int, datos: PlanIn, db: DbDep) -> PlanOut:
    return PlanOut.model_validate(PlanService(db).reemplazar(plan_id, datos))


@router.post("/{plan_id}/activar", response_model=PlanOut)
def activar(plan_id: int, db: DbDep) -> PlanOut:
    return PlanOut.model_validate(PlanService(db).activar(plan_id))


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(plan_id: int, db: DbDep) -> None:
    PlanService(db).eliminar(plan_id)
