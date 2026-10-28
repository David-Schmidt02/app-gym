"""Engine de SQLite, sesión por request y base declarativa."""
from collections.abc import Iterator

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def crear_engine(url: str) -> Engine:
    # check_same_thread=False: FastAPI usa la sesión desde el threadpool
    engine = create_engine(url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _pragmas(conexion, _registro) -> None:
        cursor = conexion.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    return engine


engine = crear_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


DIAS_POR_CANTIDAD: dict[int, list[int]] = {
    1: [2],
    2: [1, 4],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
}


def migrar_esquema(motor: Engine) -> None:
    """Agrega columnas nuevas en bases SQLite existentes sin Alembic y precarga días por defecto."""
    with motor.begin() as conn:
        cols_planes = {fila[1] for fila in conn.execute(text("PRAGMA table_info(planes)"))}
        if cols_planes and "descanso_dias" not in cols_planes:
            conn.execute(text("ALTER TABLE planes ADD COLUMN descanso_dias INTEGER NOT NULL DEFAULT 1"))

        cols_dias = {fila[1] for fila in conn.execute(text("PRAGMA table_info(dias_plan)"))}
        if cols_dias and "dia_semana" not in cols_dias:
            conn.execute(text("ALTER TABLE dias_plan ADD COLUMN dia_semana INTEGER"))
            filas = conn.execute(text("SELECT id, plan_id FROM dias_plan ORDER BY plan_id, orden")).fetchall()
            por_plan: dict[int, list[int]] = {}
            for dia_id, plan_id in filas:
                por_plan.setdefault(plan_id, []).append(dia_id)
            for ids in por_plan.values():
                sugeridos = DIAS_POR_CANTIDAD.get(len(ids))
                if not sugeridos:
                    continue
                for dia_id, dia_semana in zip(ids, sugeridos, strict=True):
                    conn.execute(
                        text("UPDATE dias_plan SET dia_semana = :ds WHERE id = :id"),
                        {"ds": dia_semana, "id": dia_id},
                    )


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
