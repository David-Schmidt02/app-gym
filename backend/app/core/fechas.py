"""Fechas en la zona horaria configurada (el servidor puede estar en UTC)."""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import get_settings


def hoy() -> date:
    return datetime.now(ZoneInfo(get_settings().zona_horaria)).date()


def lunes(dia: date) -> date:
    return dia - timedelta(days=dia.weekday())
