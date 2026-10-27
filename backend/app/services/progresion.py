"""Doble progresión: mismo peso hasta completar el tope del rango en todas las series, después subir.

Funciones puras (sin base) para poder probarlas con datos armados a mano.
"""
import math
from collections.abc import Sequence
from typing import Protocol

from app.models import Ejercicio, TipoSemana
from app.schemas.sesiones import Accion, Sugerencia

DESCARGA_PESO = 0.85
ESTANCADO_PESO = 0.90


class SerieHecha(Protocol):
    peso_kg: float
    reps: int


def redondear(peso: float, paso: float = 0.5) -> float:
    """Hacia abajo, al paso de los discos (0,5 kg)."""
    return math.floor(peso / paso + 1e-9) * paso


def peso_de_trabajo(series: Sequence[SerieHecha]) -> float:
    return max(s.peso_kg for s in series)


def reps_al_peso(series: Sequence[SerieHecha], peso: float) -> list[int]:
    return [s.reps for s in series if s.peso_kg == peso]


def _kg(peso: float) -> str:
    return f"{peso:g}".replace(".", ",")


def sugerir(
    ejercicio: Ejercicio, series: int, semana: TipoSemana, historial: Sequence[Sequence[SerieHecha]]
) -> Sugerencia:
    """`historial`: las series del ejercicio en cada sesión anterior (sin descargas), la más reciente primero."""
    base = {"series": series, "reps_min": ejercicio.reps_min, "reps_max": ejercicio.reps_max}
    reserva = "3 o 4" if semana == TipoSemana.ADAPTACION else "2 o 3"

    if not historial:
        return Sugerencia(
            accion=Accion.PRIMERA, peso_kg=None, **base,
            motivo=f"Primera vez: elegí un peso con el que llegues a {ejercicio.reps_max} reps "
            f"dejando {reserva} en reserva.",
        )

    peso = peso_de_trabajo(historial[0])
    reps = reps_al_peso(historial[0], peso)

    if semana == TipoSemana.DESCARGA:
        return Sugerencia(
            accion=Accion.DESCARGA, peso_kg=redondear(peso * DESCARGA_PESO),
            series=max(1, math.ceil(series / 2)), reps_min=ejercicio.reps_min, reps_max=ejercicio.reps_max,
            motivo="Semana de descarga: la mitad de las series y un 15 % menos de peso. Tiene que sentirse fácil.",
        )

    if len(reps) >= series and min(reps) >= ejercicio.reps_max:
        nuevo = peso + ejercicio.incremento_kg
        return Sugerencia(
            accion=Accion.SUBIR, peso_kg=nuevo, **base,
            motivo=f"La vez pasada llegaste a {ejercicio.reps_max} en todas las series: "
            f"subí {_kg(ejercicio.incremento_kg)} kg y volvé a buscar {ejercicio.reps_min}.",
        )

    if _estancado(historial, peso):
        return Sugerencia(
            accion=Accion.BAJAR, peso_kg=redondear(peso * ESTANCADO_PESO), **base,
            motivo="Dos sesiones seguidas rindiendo menos que antes con este peso: "
            "bajá un 10 % y volvé a construir.",
        )

    return Sugerencia(
        accion=Accion.MANTENER, peso_kg=peso, **base,
        motivo=f"Mismo peso: buscá sumar una rep (la vez pasada: {', '.join(map(str, reps))}).",
    )


def _estancado(historial: Sequence[Sequence[SerieHecha]], peso: float) -> bool:
    """Las dos últimas sesiones con el mismo peso sumaron menos reps que la anterior a ellas."""
    if len(historial) < 3 or any(peso_de_trabajo(sesion) != peso for sesion in historial[:3]):
        return False
    ultima, penultima, referencia = (sum(reps_al_peso(sesion, peso)) for sesion in historial[:3])
    return ultima < referencia and penultima < referencia
