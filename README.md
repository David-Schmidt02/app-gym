# Gym

> **Versión** 1.1.0 · **Última actualización** 2026-10-28

Libreta de gimnasio personal: rutina por grupo muscular, registro rápido de pesos y repeticiones, carga progresiva automática, semanas de descarga, y peso corporal y medidas.

| Versión | Fecha | Cambios |
|---|---|---|
| 1.1.0 | 2026-10-28 | Diseño horizontal de dos columnas en escritorio, selectores desplegables propios, iconografía anatómica por grupo muscular y agenda semanal fija con descanso configurable y postergación inteligente en cascada. |
| 1.0.0 | 2026-10-26 | Primera versión: banco de ejercicios por grupo muscular, rutinas de 2, 3 y 4 días, entrenamiento con «la vez pasada» y sugerencia de peso (doble progresión), ciclo de adaptación + bloques de 4 semanas de progresión y 1 de descarga, descanso entre series, historial editable, curva de progreso por ejercicio, y peso corporal y medidas. |

## Qué hace

- **Hoy**: la semana del ciclo (adaptación, progresión 1 a 4 o descarga), el calendario semanal con la rutina asignada por día (permite postergar a mañana o mover días con reprogramación en cascada respetando los descansos), el entrenamiento que toca hoy (o aviso de día de descanso) con el botón Empezar, y los últimos entrenamientos.
- **Entrenar** (botón del centro): cada ejercicio muestra lo que hiciste la vez pasada y la sugerencia de hoy con su motivo. Las series ya vienen con el peso sugerido; anotás las reps y marcás la serie, y arranca el descanso (2 min en compuestos, 1:15 en aislados, +15 s a mano). Lo anotado queda guardado en el teléfono, un borrador por día de la rutina, hasta tocar «Terminar».
- **Progreso**: por ejercicio, el récord de peso, el 1RM estimado (Epley) y la curva de peso de trabajo y 1RM por sesión (las descargas, huecas). El historial completo se corrige o se borra desde ahí.
- **Cuerpo**: peso, cintura, cadera, pecho, brazo y muslo. Cada anotación lleva lo que se midió ese día; muestra el último valor, la diferencia con el anterior y con el primero, y la curva.
- **Rutina**: las rutinas (una activa) con su editor de días, día de la semana asignado, descanso mínimo entre sesiones, ejercicios y series; y el banco de ejercicios (hasta unos 5 por grupo) con su rango de reps y cuántos kg subir.
- **Ajustes**: en qué semana del ciclo estás (para retomar, adelantar o repetir una descarga), tema y cuenta.

Una sola cuenta: el registro se cierra al crearla (`MAX_USUARIOS`).

## La lógica de entrenamiento

**Doble progresión** (`backend/app/services/progresion.py`). Cada ejercicio tiene un rango de reps (6–10 en compuestos, 10–15 en aislados) y un incremento:

| Situación (última sesión fuera de descargas, con su peso más alto) | Sugerencia |
|---|---|
| Sin registros | Elegir un peso para llegar al tope dejando 2–3 reps en reserva (3–4 en adaptación) |
| Llegaste al tope del rango en todas las series | Subir el incremento (2,5 kg torso, 5 kg pierna, 1–2 kg mancuernas) y volver al piso del rango |
| No llegaste | Mismo peso, sumar una rep |
| Las dos últimas sesiones con el mismo peso sumaron menos reps que la anterior | Bajar 10 % y volver a construir |
| Semana de descarga | La mitad de las series y 15 % menos de peso |

Los pesos sugeridos se redondean hacia abajo al medio kilo.

**Ciclo** (`backend/app/services/ciclo_service.py`). Semana 0 de adaptación y después bloques de 5 semanas: 4 de progresión y la 5.ª de descarga. Cada lunes avanza una semana. Cada entrenamiento guarda el tipo de semana de su fecha; las descargas no cuentan para la progresión.

**Rutinas de arranque** (`backend/app/services/semillas.py`, se cargan solo en una base vacía): Fase 1 de 2 días (cuerpo completo A/B, activa), Fase 2 de 3 días (A/B/C) y Fase 3 de 4 días (Torso/Pierna). El progreso es por ejercicio, así que al cambiar de rutina cada uno sigue desde donde quedó.

## Stack

| Parte | Tecnología |
|---|---|
| Backend | FastAPI, SQLAlchemy 2, Pydantic 2, SQLite, `uv` |
| Frontend | React 19 + Vite, CSS propio, instalable como app (manifest) |
| Deploy | Railway, un servicio con `Dockerfile` en la raíz y un volumen para la base |

Mismo esqueleto que [app-ahorro](https://github.com/David-Schmidt02/app-ahorro). Las tablas se crean e hidratan de forma idempotente al iniciar (`Base.metadata.create_all` + `migrar_esquema`).

## Desarrollo local

```bash
# API en :8000 (crea backend/app_gym.db)
cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000

# Frontend en :5173, con proxy de /api a :8000
cd frontend && npm install && npm run dev
```

Abrir http://localhost:5173 y crear la cuenta. Para empezar de cero, borrar `backend/app_gym.db*`.

```bash
cd backend && uv run pytest -q     # tests de la API y de la progresión
cd frontend && npm run lint        # lint del frontend
```

## Configuración

Variables de entorno (o `backend/.env` en local):

| Variable | Default | Uso |
|---|---|---|
| `DATABASE_URL` | `sqlite:///backend/app_gym.db` | En Railway: `sqlite:////data/app_gym.db` |
| `SECRET_KEY` | clave de desarrollo | **Obligatoria en producción**; firma las sesiones |
| `TOKEN_DIAS` | `90` | Duración de la sesión |
| `MAX_USUARIOS` | `1` | Cuentas permitidas |
| `ZONA_HORARIA` | `America/Argentina/Buenos_Aires` | Para saber qué día y qué semana del ciclo es |

## CI y deploy

GitHub Actions corre en cada PR y en cada push a `main`: tests del backend, lint y build del frontend, y build de la imagen Docker. Las ramas mergeadas se borran solas.

En Railway: un servicio desde la raíz del repo (usa el `Dockerfile`, despliega cada push a `main`), un volumen montado en `/data`, y las variables `DATABASE_URL=sqlite:////data/app_gym.db` y `SECRET_KEY`.
