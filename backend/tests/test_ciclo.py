from datetime import date

from app.services.ciclo_service import describir
from tests.conftest import entrenar

INICIO = date(2026, 11, 2)


def test_semanas_del_ciclo():
    assert describir(0, INICIO).tipo == "adaptacion"
    assert describir(0, INICIO).proxima_descarga == date(2026, 12, 7)
    assert [describir(s, INICIO).tipo for s in range(1, 7)] == [
        "progresion", "progresion", "progresion", "progresion", "descarga", "progresion"
    ]
    sexta = describir(6, INICIO)
    assert (sexta.bloque, sexta.semana_del_bloque) == (2, 1)
    assert describir(5, INICIO).proxima_descarga is None


def test_arranca_en_adaptacion_y_avanza_con_los_lunes(api, hoy):
    assert api.get("/api/ciclo").json()["semana"] == 0
    hoy(date(2026, 11, 8))  # domingo de la misma semana
    assert api.get("/api/ciclo").json()["semana"] == 0
    hoy(date(2026, 11, 9))
    assert api.get("/api/ciclo").json()["tipo"] == "progresion"


def test_fijar_la_semana(api):
    ciclo = api.put("/api/ciclo", json={"semana": 5}).json()
    assert (ciclo["semana"], ciclo["tipo"]) == (5, "descarga")
    assert api.get("/api/ciclo").json()["semana"] == 5


def test_la_sesion_guarda_el_tipo_de_semana_de_su_fecha(api):
    api.put("/api/ciclo", json={"semana": 5})
    assert entrenar(api, "2026-11-03", {"Sentadilla": [(50, 10)]})["tipo_semana"] == "descarga"
    assert entrenar(api, "2026-10-27", {"Sentadilla": [(60, 10)]})["tipo_semana"] == "progresion"
