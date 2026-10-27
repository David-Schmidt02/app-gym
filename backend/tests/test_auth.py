from tests.conftest import registrar


def test_una_sola_cuenta(cliente):
    assert cliente.get("/api/auth/estado").json() == {"registro_abierto": True}
    registrar(cliente)
    assert cliente.get("/api/auth/estado").json() == {"registro_abierto": False}
    segunda = cliente.post("/api/auth/registro", json={"nombre": "Otro", "email": "otro@gym.com", "password": "secreta1"})
    assert segunda.status_code == 422


def test_rutas_privadas_piden_sesion(cliente):
    registrar(cliente)
    assert cliente.get("/api/hoy").status_code == 401
    sesion = cliente.post("/api/auth/login", json={"email": "david@gym.com", "password": "secreta1"}).json()
    assert cliente.get("/api/hoy", headers={"Authorization": f"Bearer {sesion['token']}"}).status_code == 200
