from tests.conftest import ejercicio_id, entrenar


def test_arranque_con_la_fase_1_activa(api):
    hoy = api.get("/api/hoy").json()
    assert hoy["plan"]["nombre"] == "Fase 1 · 2 días"
    assert [d["nombre"] for d in hoy["plan"]["dias"]] == ["Día A", "Día B"]
    assert hoy["dia_sugerido"] == 0
    assert hoy["sesiones_semana"] == 0
    assert len(api.get("/api/planes").json()) == 3


def test_el_dia_sugerido_alterna(api):
    entrenar(api, "2026-11-02", {"Sentadilla": [(60, 8)]}, dia_orden=0)
    assert api.get("/api/hoy").json()["dia_sugerido"] == 1
    entrenar(api, "2026-11-04", {"Peso muerto rumano": [(60, 8)]}, dia_orden=1)
    hoy = api.get("/api/hoy").json()
    assert (hoy["dia_sugerido"], hoy["sesiones_semana"]) == (0, 2)


def test_entrenamiento_con_la_vez_pasada_y_la_sugerencia(api):
    entrenar(api, "2026-11-02", {"Sentadilla": [(60, 10), (60, 10), (60, 10)], "Press banca": [(40, 8)] * 3})
    dia = api.get("/api/entrenar/0").json()
    por_nombre = {e["ejercicio"]["nombre"]: e for e in dia["ejercicios"]}

    sentadilla = por_nombre["Sentadilla"]
    assert sentadilla["ultima_vez"]["fecha"] == "2026-11-02"
    assert [s["reps"] for s in sentadilla["ultima_vez"]["series"]] == [10, 10, 10]
    assert (sentadilla["sugerencia"]["accion"], sentadilla["sugerencia"]["peso_kg"]) == ("subir", 65)

    assert por_nombre["Press banca"]["sugerencia"]["accion"] == "mantener"
    assert por_nombre["Remo con barra"]["sugerencia"]["accion"] == "primera"


def test_las_descargas_no_cuentan_para_la_progresion(api):
    entrenar(api, "2026-10-26", {"Sentadilla": [(60, 10)] * 3})
    api.put("/api/ciclo", json={"semana": 5})
    entrenar(api, "2026-11-02", {"Sentadilla": [(50, 6)] * 2})

    sentadilla = api.get("/api/entrenar/0").json()["ejercicios"][0]
    assert sentadilla["ultima_vez"]["fecha"] == "2026-10-26"
    assert (sentadilla["sugerencia"]["accion"], sentadilla["sugerencia"]["series"]) == ("descarga", 2)


def test_progreso_y_records(api):
    entrenar(api, "2026-10-26", {"Sentadilla": [(60, 10), (60, 9)]})
    entrenar(api, "2026-11-02", {"Sentadilla": [(65, 7), (65, 6)]})
    progreso = api.get(f"/api/ejercicios/{ejercicio_id(api, 'Sentadilla')}/progreso").json()
    assert [p["peso_kg"] for p in progreso["puntos"]] == [60, 65]
    assert progreso["puntos"][0]["uno_rm"] == 80.0
    assert progreso["record_peso"]["fecha"] == "2026-11-02"


def test_editar_y_borrar_un_entrenamiento(api):
    sesion = entrenar(api, "2026-11-02", {"Sentadilla": [(60, 10)]})
    cuerpo = {**sesion, "series": [{"ejercicio_id": ejercicio_id(api, "Sentadilla"), "peso_kg": 62.5, "reps": 8}]}
    editada = api.put(f"/api/sesiones/{sesion['id']}", json=cuerpo).json()
    assert editada["series"] == [{"ejercicio_id": cuerpo["series"][0]["ejercicio_id"], "peso_kg": 62.5, "reps": 8}]
    assert api.delete(f"/api/sesiones/{sesion['id']}").status_code == 204
    assert api.get("/api/sesiones").json() == []
