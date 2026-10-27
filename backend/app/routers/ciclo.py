from fastapi import APIRouter

from app.dependencies import DbDep
from app.schemas.ciclo import CicloIn, CicloOut
from app.services.ciclo_service import CicloService

router = APIRouter(prefix="/ciclo", tags=["Ciclo"])


@router.get("", response_model=CicloOut)
def estado(db: DbDep) -> CicloOut:
    return CicloService(db).estado()


@router.put("", response_model=CicloOut)
def fijar(datos: CicloIn, db: DbDep) -> CicloOut:
    return CicloService(db).fijar(datos.semana)
