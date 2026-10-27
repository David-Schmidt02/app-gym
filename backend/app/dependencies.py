"""Dependencias inyectables de los routers."""
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import NoAutorizado
from app.core.security import leer_token
from app.database import get_db
from app.models import Usuario

DbDep = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False)


def usuario_actual(
    db: DbDep, credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]
) -> Usuario:
    if credenciales is None:
        raise NoAutorizado("Ingresá para continuar")
    usuario = db.get(Usuario, leer_token(credenciales.credentials))
    if usuario is None:
        raise NoAutorizado("La cuenta ya no existe")
    return usuario


UsuarioDep = Annotated[Usuario, Depends(usuario_actual)]
