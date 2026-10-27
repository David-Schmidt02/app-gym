"""Configuración leída de variables de entorno (o de backend/.env en local)."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY_DESARROLLO = "solo-para-desarrollo-cambiar-en-produccion"


class Settings(BaseSettings):
    """Valores con default pensado para desarrollo local."""

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    database_url: str = f"sqlite:///{BACKEND_DIR / 'app_gym.db'}"
    secret_key: str = SECRET_KEY_DESARROLLO
    token_dias: int = 90
    max_usuarios: int = 1
    zona_horaria: str = "America/Argentina/Buenos_Aires"
    frontend_dist: Path = BACKEND_DIR.parent / "frontend" / "dist"


@lru_cache
def get_settings() -> Settings:
    return Settings()
