from types import SimpleNamespace as S

from app.models import TipoSemana
from app.schemas.sesiones import Accion
from app.services.progresion import redondear, sugerir

SENTADILLA = S(reps_min=6, reps_max=10, incremento_kg=5)
P, D, A = TipoSemana.PROGRESION, TipoSemana.DESCARGA, TipoSemana.ADAPTACION


def series(peso: float, *reps: int) -> list[S]:
    return [S(peso_kg=peso, reps=r) for r in reps]


def test_primera_vez_no_sugiere_peso():
    sugerencia = sugerir(SENTADILLA, 3, A, [])
    assert sugerencia.accion == Accion.PRIMERA
    assert sugerencia.peso_kg is None
    assert "3 o 4 en reserva" in sugerencia.motivo


def test_sube_al_completar_el_tope_en_todas_las_series():
    sugerencia = sugerir(SENTADILLA, 3, P, [series(60, 10, 10, 10)])
    assert (sugerencia.accion, sugerencia.peso_kg) == (Accion.SUBIR, 65)


def test_mantiene_si_falta_una_rep_o_una_serie():
    assert sugerir(SENTADILLA, 3, P, [series(60, 10, 10, 9)]).accion == Accion.MANTENER
    assert sugerir(SENTADILLA, 3, P, [series(60, 10, 10)]).accion == Accion.MANTENER
    assert "10, 10, 9" in sugerir(SENTADILLA, 3, P, [series(60, 10, 10, 9)]).motivo


def test_el_peso_de_trabajo_es_el_mas_alto():
    # Una serie de aproximación más liviana no cuenta
    sugerencia = sugerir(SENTADILLA, 3, P, [series(40, 10) + series(60, 10, 10, 10)])
    assert sugerencia.peso_kg == 65


def test_baja_si_dos_sesiones_rinden_menos_que_la_anterior():
    historial = [series(60, 8, 7, 6), series(60, 8, 8, 7), series(60, 9, 9, 8)]
    sugerencia = sugerir(SENTADILLA, 3, P, historial)
    assert (sugerencia.accion, sugerencia.peso_kg) == (Accion.BAJAR, 54)


def test_no_es_estancamiento_si_cambio_el_peso():
    historial = [series(60, 8, 7, 6), series(60, 8, 8, 7), series(55, 10, 10, 10)]
    assert sugerir(SENTADILLA, 3, P, historial).accion == Accion.MANTENER


def test_descarga_mitad_de_series_y_menos_peso():
    sugerencia = sugerir(SENTADILLA, 3, D, [series(60, 10, 10, 10)])
    assert (sugerencia.accion, sugerencia.peso_kg, sugerencia.series) == (Accion.DESCARGA, 51, 2)


def test_redondea_hacia_abajo_al_medio_kilo():
    assert redondear(51.3) == 51
    assert redondear(51.5) == 51.5
    assert redondear(42.5 * 0.85) == 36
