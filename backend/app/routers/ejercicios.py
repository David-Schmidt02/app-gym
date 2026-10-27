from fastapi import APIRouter, status

from app.dependencies import DbDep
from app.schemas.ejercicios import EjercicioIn, EjercicioOut, EjercicioUpdate, ProgresoOut
from app.services.ejercicio_service import EjercicioService

router = APIRouter(prefix="/ejercicios", tags=["Ejercicios"])


@router.get("", response_model=list[EjercicioOut])
def listar(db: DbDep) -> list[EjercicioOut]:
    return [EjercicioOut.model_validate(e) for e in EjercicioService(db).listar()]


@router.post("", response_model=EjercicioOut, status_code=status.HTTP_201_CREATED)
def crear(datos: EjercicioIn, db: DbDep) -> EjercicioOut:
    return EjercicioOut.model_validate(EjercicioService(db).crear(datos))


@router.patch("/{ejercicio_id}", response_model=EjercicioOut)
def actualizar(ejercicio_id: int, datos: EjercicioUpdate, db: DbDep) -> EjercicioOut:
    return EjercicioOut.model_validate(EjercicioService(db).actualizar(ejercicio_id, datos))


@router.delete("/{ejercicio_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(ejercicio_id: int, db: DbDep) -> None:
    EjercicioService(db).eliminar(ejercicio_id)


@router.get("/{ejercicio_id}/progreso", response_model=ProgresoOut)
def progreso(ejercicio_id: int, db: DbDep) -> ProgresoOut:
    return EjercicioService(db).progreso(ejercicio_id)
