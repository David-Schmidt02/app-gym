from tests.conftest import ejercicio_id, entrenar


def test_crear_editar_y_activar_una_rutina(api):
    sentadilla = ejercicio_id(api, "Sentadilla")
    plan = api.post("/api/planes", json={"nombre": "Prueba", "dias": [{"nombre": "Único", "ejercicios": [
        {"ejercicio_id": sentadilla, "series": 5}
    ]}]}).json()
    assert plan["activo"] is False
    assert plan["dias"][0]["ejercicios"][0]["series"] == 5

    editado = api.put(f"/api/planes/{plan['id']}", json={"nombre": "Prueba 2", "dias": [
        {"nombre": "X", "ejercicios": []}, {"nombre": "Y", "ejercicios": [{"ejercicio_id": sentadilla}]},
    ]}).json()
    assert [d["nombre"] for d in editado["dias"]] == ["X", "Y"]

    api.post(f"/api/planes/{plan['id']}/activar")
    activos = [p["nombre"] for p in api.get("/api/planes").json() if p["activo"]]
    assert activos == ["Prueba 2"]


def test_no_se_borra_la_rutina_activa(api):
    activa = api.get("/api/hoy").json()["plan"]
    assert api.delete(f"/api/planes/{activa['id']}").status_code == 422


def test_ejercicio_con_historial_se_archiva_en_lugar_de_borrarse(api):
    entrenar(api, "2026-11-02", {"Sentadilla": [(60, 10)]})
    sentadilla = ejercicio_id(api, "Sentadilla")
    assert api.delete(f"/api/ejercicios/{sentadilla}").status_code == 422
    assert api.patch(f"/api/ejercicios/{sentadilla}", json={"archivado": True}).json()["archivado"] is True


def test_alta_de_ejercicio(api):
    nuevo = {"nombre": "Pullover", "grupo": "espalda", "tipo": "aislado", "reps_min": 10, "reps_max": 12,
             "incremento_kg": 2}
    assert api.post("/api/ejercicios", json=nuevo).status_code == 201
    assert api.post("/api/ejercicios", json=nuevo).status_code == 409
    invertido = {**nuevo, "nombre": "Otro", "reps_min": 12, "reps_max": 8}
    assert api.post("/api/ejercicios", json=invertido).status_code == 422
    creado = ejercicio_id(api, "Pullover")
    assert api.delete(f"/api/ejercicios/{creado}").status_code == 204
