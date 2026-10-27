from fastapi import APIRouter, status

from app.dependencies import DbDep
from app.schemas.mediciones import MedicionIn, MedicionOut
from app.services.medicion_service import MedicionService

router = APIRouter(prefix="/mediciones", tags=["Medidas"])


@router.get("", response_model=list[MedicionOut])
def listar(db: DbDep) -> list[MedicionOut]:
    return [MedicionOut.model_validate(m) for m in MedicionService(db).listar()]


@router.post("", response_model=MedicionOut, status_code=status.HTTP_201_CREATED)
def crear(datos: MedicionIn, db: DbDep) -> MedicionOut:
    return MedicionOut.model_validate(MedicionService(db).crear(datos))


@router.put("/{medicion_id}", response_model=MedicionOut)
def reemplazar(medicion_id: int, datos: MedicionIn, db: DbDep) -> MedicionOut:
    return MedicionOut.model_validate(MedicionService(db).reemplazar(medicion_id, datos))


@router.delete("/{medicion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(medicion_id: int, db: DbDep) -> None:
    MedicionService(db).eliminar(medicion_id)
