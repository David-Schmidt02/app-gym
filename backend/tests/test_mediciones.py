def test_mediciones(api):
    assert api.post("/api/mediciones", json={"fecha": "2026-11-02"}).status_code == 422
    api.post("/api/mediciones", json={"fecha": "2026-11-09", "peso_kg": 81.2, "cintura_cm": 90})
    primera = api.post("/api/mediciones", json={"fecha": "2026-11-02", "peso_kg": 82.5}).json()

    lista = api.get("/api/mediciones").json()
    assert [m["fecha"] for m in lista] == ["2026-11-02", "2026-11-09"]
    assert lista[1]["cintura_cm"] == 90

    editada = api.put(f"/api/mediciones/{primera['id']}", json={"fecha": "2026-11-02", "peso_kg": 82}).json()
    assert editada["peso_kg"] == 82
    assert api.delete(f"/api/mediciones/{primera['id']}").status_code == 204
    assert len(api.get("/api/mediciones").json()) == 1
