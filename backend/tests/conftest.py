import os
import tempfile
from datetime import date
from pathlib import Path

# La base de los tests va a un archivo temporal, antes de que app.database cree el engine
_DIR = Path(tempfile.mkdtemp(prefix="app-gym-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_DIR / 'tests.db'}"
os.environ["FRONTEND_DIST"] = str(_DIR / "sin-frontend")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services import agenda_service, ciclo_service, sesion_service  # noqa: E402


@pytest.fixture
def hoy(monkeypatch):
    """Fija la fecha de hoy: `hoy(date(2026, 11, 2))`. Por defecto, un lunes."""

    def fijar(dia: date) -> None:
        for modulo in (agenda_service, ciclo_service, sesion_service):
            monkeypatch.setattr(modulo, "hoy", lambda: dia)

    fijar(date(2026, 11, 2))
    return fijar


@pytest.fixture
def cliente(hoy):
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:
        yield c


def registrar(cliente: TestClient, email: str = "david@gym.com") -> dict:
    respuesta = cliente.post("/api/auth/registro", json={"nombre": "David", "email": email, "password": "secreta1"})
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()


@pytest.fixture
def api(cliente: TestClient) -> TestClient:
    """Cliente con sesión iniciada."""
    sesion = registrar(cliente)
    cliente.headers["Authorization"] = f"Bearer {sesion['token']}"
    return cliente


def ejercicio_id(api: TestClient, nombre: str) -> int:
    return next(e["id"] for e in api.get("/api/ejercicios").json() if e["nombre"] == nombre)


def entrenar(api: TestClient, fecha: str, series: dict[str, list[tuple[float, int]]], dia_orden: int = 0) -> dict:
    """Guarda un entrenamiento de la rutina activa: {"Sentadilla": [(60, 10), (60, 9)]}."""
    plan = api.get("/api/hoy").json()["plan"]
    cuerpo = {
        "fecha": fecha,
        "plan_id": plan["id"],
        "dia_orden": dia_orden,
        "dia_nombre": plan["dias"][dia_orden]["nombre"],
        "series": [
            {"ejercicio_id": ejercicio_id(api, nombre), "peso_kg": peso, "reps": reps}
            for nombre, lista in series.items()
            for peso, reps in lista
        ],
    }
    respuesta = api.post("/api/sesiones", json=cuerpo)
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()
