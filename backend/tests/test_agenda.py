from datetime import date

from sqlalchemy import create_engine, text

from app.database import migrar_esquema
from tests.conftest import ejercicio_id, entrenar


def _activar_fase(api, fragmento: str) -> dict:
    planes = api.get("/api/planes").json()
    elegido = next(p for p in planes if fragmento in p["nombre"])
    return api.post(f"/api/planes/{elegido['id']}/activar").json()


def _mapa_semana(api) -> tuple[dict, dict[int, tuple[str, int | None, bool]]]:
    semana = api.get("/api/hoy").json()["semana"]
    por_dia = {d["dia_semana"]: (d["estado"], d["dia_orden"], d["reprogramado"]) for d in semana["dias"]}
    return semana, por_dia


def test_fases_semilla_traen_calendario_y_descanso_por_defecto(api, hoy):
    planes = {p["nombre"]: p for p in api.get("/api/planes").json()}
    assert [d["dia_semana"] for d in planes["Fase 1 · 2 días"]["dias"]] == [1, 4]
    assert [d["dia_semana"] for d in planes["Fase 2 · 3 días"]["dias"]] == [0, 2, 4]
    assert [d["dia_semana"] for d in planes["Fase 3 · 4 días"]["dias"]] == [0, 1, 3, 4]
    assert planes["Fase 1 · 2 días"]["descanso_dias"] == 1

    # Lunes 2026-11-02: Fase 1 toca martes y viernes -> hoy es descanso
    hoy(date(2026, 11, 2))
    estado = api.get("/api/hoy").json()
    assert estado["semana"]["estado_hoy"] == "descanso"
    assert estado["semana"]["proximo_dia"] == {"dia_orden": 0, "dia_nombre": "Día A", "fecha": "2026-11-03"}
    assert estado["dia_sugerido"] == 0

    # Martes 2026-11-03: toca Día A
    hoy(date(2026, 11, 3))
    estado = api.get("/api/hoy").json()
    assert (estado["semana"]["estado_hoy"], estado["semana"]["dia_hoy"]) == ("entrenar", 0)

    # Al registrar el entrenamiento de hoy pasa a 'hecho'
    entrenar(api, "2026-11-03", {"Sentadilla": [(60, 8)]}, dia_orden=0)
    estado = api.get("/api/hoy").json()
    assert estado["semana"]["estado_hoy"] == "hecho"
    assert estado["semana"]["proximo_dia"]["fecha"] == "2026-11-06"


def test_postergar_dia_reacomoda_en_cascada_con_descanso(api, hoy):
    _activar_fase(api, "Fase 2")  # Lun (0), Mié (2), Vie (4), descanso = 1
    hoy(date(2026, 11, 2))  # Lunes

    # Pasar Día A del lunes al martes -> Día B pasa a jueves (3) y Día C a sábado (5)
    res = api.put("/api/agenda/dia", json={"dia_orden": 0, "fecha": "2026-11-03", "cascada": True})
    assert res.status_code == 200
    semana, por_dia = _mapa_semana(api)
    assert semana["modificada"] is True
    assert semana["estado_hoy"] == "descanso"
    assert por_dia[1] == ("pendiente", 0, True)  # Mar: Día A
    assert por_dia[3] == ("pendiente", 1, True)  # Jue: Día B
    assert por_dia[5] == ("pendiente", 2, True)  # Sáb: Día C

    # Si el usuario fuerza Día B el miércoles sin cascada, respeta su elección manual
    res = api.put("/api/agenda/dia", json={"dia_orden": 1, "fecha": "2026-11-04", "cascada": False})
    assert res.status_code == 200
    _, por_dia = _mapa_semana(api)
    assert por_dia[1][1] == 0  # Mar: Día A
    assert por_dia[2][1] == 1  # Mié: Día B

    # Restaurar semana limpia todos los ajustes
    assert api.delete("/api/agenda/semana").status_code == 200
    semana, por_dia = _mapa_semana(api)
    assert semana["modificada"] is False
    assert (por_dia[0][1], por_dia[2][1], por_dia[4][1]) == (0, 1, 2)


def test_autorecuperacion_y_compresion_al_final_de_semana(api, hoy):
    _activar_fase(api, "Fase 2")  # Lun, Mié, Vie

    # Jueves sin haber entrenado: quedan 4 días (Jue, Vie, Sáb, Dom) para 3 sesiones -> Jue, Sáb, Dom
    hoy(date(2026, 11, 5))
    _, por_dia = _mapa_semana(api)
    assert por_dia[3] == ("pendiente", 0, True)  # Jue: Día A
    assert por_dia[4][0] == "descanso"           # Vie: mantiene 1 día de descanso tras Día A
    assert por_dia[5] == ("pendiente", 1, True)  # Sáb: Día B
    assert por_dia[6] == ("pendiente", 2, True)  # Dom: Día C (comprime último hueco para entrar en la semana)


def test_adelantar_entrenamiento_en_dia_libre_y_saltear(api, hoy):
    _activar_fase(api, "Fase 2")  # Lun, Mié, Vie
    hoy(date(2026, 11, 3))  # Martes
    entrenar(api, "2026-11-02", {"Sentadilla": [(60, 8)]}, dia_orden=0)

    # Adelanta Día B (del miércoles) al martes
    entrenar(api, "2026-11-03", {"Peso muerto rumano": [(60, 8)]}, dia_orden=1)
    _, por_dia = _mapa_semana(api)
    assert por_dia[0][0] == "hecho"
    assert por_dia[1][0] == "hecho"
    assert por_dia[2][0] == "descanso"      # Miércoles quedó liberado
    assert por_dia[4] == ("pendiente", 2, False)  # Viernes sigue con Día C

    # Saltear Día C solo por esta semana
    res = api.put("/api/agenda/dia", json={"dia_orden": 2, "fecha": None})
    assert res.status_code == 200
    semana, por_dia = _mapa_semana(api)
    assert por_dia[4][0] == "descanso"
    assert [s["dia_orden"] for s in semana["salteados"]] == [2]


def test_descanso_configurable_y_validacion_de_dias(api, hoy):
    sentadilla = ejercicio_id(api, "Sentadilla")
    invalido = {
        "nombre": "Duplicado",
        "descanso_dias": 2,
        "dias": [
            {"nombre": "A", "dia_semana": 1, "ejercicios": [{"ejercicio_id": sentadilla}]},
            {"nombre": "B", "dia_semana": 1, "ejercicios": [{"ejercicio_id": sentadilla}]},
        ],
    }
    assert api.post("/api/planes", json=invalido).status_code == 422

    creado = api.post(
        "/api/planes",
        json={
            "nombre": "Con 2 descansos",
            "descanso_dias": 2,
            "dias": [
                {"nombre": "A", "dia_semana": 0, "ejercicios": [{"ejercicio_id": sentadilla}]},
                {"nombre": "B", "dia_semana": 3, "ejercicios": [{"ejercicio_id": sentadilla}]},
            ],
        },
    )
    assert creado.status_code == 201
    plan = creado.json()
    api.post(f"/api/planes/{plan['id']}/activar")

    hoy(date(2026, 11, 2))  # Lunes: si pasa A al miércoles (2), con 2 días de descanso B va al sábado (5)
    api.put("/api/agenda/dia", json={"dia_orden": 0, "fecha": "2026-11-04", "cascada": True})
    _, por_dia = _mapa_semana(api)
    assert por_dia[2][1] == 0
    assert por_dia[5][1] == 1


def test_migracion_sqlite_precarga_dias_en_base_existente(tmp_path):
    motor = create_engine(f"sqlite:///{tmp_path / 'vieja.db'}")
    with motor.begin() as conn:
        conn.execute(text("CREATE TABLE planes (id INTEGER PRIMARY KEY, nombre TEXT, descripcion TEXT, activo BOOLEAN)"))
        conn.execute(text("CREATE TABLE dias_plan (id INTEGER PRIMARY KEY, plan_id INTEGER, orden INTEGER, nombre TEXT)"))
        conn.execute(text("INSERT INTO planes (id, nombre, activo) VALUES (1, 'Fase 1', 1), (2, 'Fase 2', 0)"))
        conn.execute(text("INSERT INTO dias_plan (id, plan_id, orden, nombre) VALUES (1, 1, 0, 'A'), (2, 1, 1, 'B')"))
        conn.execute(
            text("INSERT INTO dias_plan (id, plan_id, orden, nombre) VALUES (3, 2, 0, 'A'), (4, 2, 1, 'B'), (5, 2, 2, 'C')")
        )

    migrar_esquema(motor)

    with motor.connect() as conn:
        descanso = conn.execute(text("SELECT descanso_dias FROM planes WHERE id = 1")).scalar_one()
        dias_f1 = [r[0] for r in conn.execute(text("SELECT dia_semana FROM dias_plan WHERE plan_id = 1 ORDER BY orden"))]
        dias_f2 = [r[0] for r in conn.execute(text("SELECT dia_semana FROM dias_plan WHERE plan_id = 2 ORDER BY orden"))]

    assert descanso == 1
    assert dias_f1 == [1, 4]
    assert dias_f2 == [0, 2, 4]
