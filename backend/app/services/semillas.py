"""Banco de ejercicios y las tres rutinas de arranque (2, 3 y 4 días), cargados solo en una base vacía."""
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.models import DiaPlan, Ejercicio, EjercicioDelDia, Grupo, Plan, TipoEjercicio

C, A = TipoEjercicio.COMPUESTO, TipoEjercicio.AISLADO

# nombre, tipo, reps mínimas, reps máximas, kg que se suben al completar el rango
EJERCICIOS: dict[Grupo, list[tuple[str, TipoEjercicio, int, int, float]]] = {
    Grupo.PECHO: [
        ("Press banca", C, 6, 10, 2.5),
        ("Press inclinado con mancuernas", C, 8, 12, 2),
        ("Fondos en paralelas", C, 6, 12, 2.5),
        ("Aperturas con mancuernas", A, 10, 15, 1),
        ("Cruce de poleas", A, 12, 15, 2.5),
    ],
    Grupo.ESPALDA: [
        ("Remo con barra", C, 6, 10, 2.5),
        ("Jalón al pecho", C, 8, 12, 2.5),
        ("Dominadas", C, 5, 10, 2.5),
        ("Remo con mancuerna", C, 8, 12, 2),
        ("Remo en polea baja", C, 10, 12, 2.5),
    ],
    Grupo.HOMBROS: [
        ("Press militar con barra", C, 6, 10, 2.5),
        ("Press de hombros con mancuernas", C, 8, 12, 2),
        ("Elevaciones laterales", A, 12, 15, 1),
        ("Face pull", A, 12, 15, 2.5),
        ("Pájaros con mancuernas", A, 12, 15, 1),
    ],
    Grupo.BICEPS: [
        ("Curl con barra", A, 8, 12, 2.5),
        ("Curl con mancuernas", A, 10, 12, 1),
        ("Curl martillo", A, 10, 12, 1),
        ("Curl en polea", A, 12, 15, 2.5),
    ],
    Grupo.TRICEPS: [
        ("Extensión de tríceps en polea", A, 10, 15, 2.5),
        ("Press francés", A, 8, 12, 2.5),
        ("Extensión sobre la cabeza con mancuerna", A, 10, 12, 1),
        ("Fondos entre bancos", A, 10, 15, 2.5),
    ],
    Grupo.CUADRICEPS: [
        ("Sentadilla", C, 6, 10, 5),
        ("Prensa", C, 10, 12, 10),
        ("Sentadilla búlgara", C, 8, 12, 2),
        ("Zancadas", C, 10, 12, 2),
        ("Extensión de cuádriceps", A, 12, 15, 5),
    ],
    Grupo.ISQUIOS: [
        ("Peso muerto rumano", C, 6, 10, 5),
        ("Peso muerto", C, 5, 8, 5),
        ("Hip thrust", C, 8, 12, 5),
        ("Curl femoral", A, 10, 15, 5),
    ],
    Grupo.GEMELOS: [
        ("Gemelos de pie", A, 10, 15, 5),
        ("Gemelos sentado", A, 12, 20, 5),
    ],
    Grupo.CORE: [
        ("Crunch en polea", A, 10, 15, 2.5),
        ("Elevación de piernas colgado", A, 8, 15, 2.5),
        ("Rueda abdominal", A, 8, 12, 2.5),
        ("Pallof press", A, 10, 12, 2.5),
    ],
}

# nombre, descripción, activo, días con (ejercicio, series)
PLANES = [
    (
        "Fase 1 · 2 días",
        "Cuerpo completo dos veces por semana, para volver a ponerse en forma. Un día libre entre A y B.",
        True,
        [
            ("Día A", [("Sentadilla", 3), ("Press banca", 3), ("Remo con barra", 3),
                       ("Elevaciones laterales", 3), ("Curl con barra", 2), ("Crunch en polea", 2)]),
            ("Día B", [("Peso muerto rumano", 3), ("Press militar con barra", 3), ("Jalón al pecho", 3),
                       ("Press inclinado con mancuernas", 3), ("Extensión de tríceps en polea", 2),
                       ("Gemelos de pie", 2)]),
        ],
    ),
    (
        "Fase 2 · 3 días",
        "Cuerpo completo A / B / C, por ejemplo lunes, miércoles y viernes.",
        False,
        [
            ("Día A", [("Sentadilla", 3), ("Press banca", 3), ("Remo con barra", 3),
                       ("Elevaciones laterales", 3), ("Curl con barra", 2), ("Crunch en polea", 2)]),
            ("Día B", [("Peso muerto rumano", 3), ("Press militar con barra", 3), ("Jalón al pecho", 3),
                       ("Press inclinado con mancuernas", 3), ("Extensión de tríceps en polea", 3),
                       ("Gemelos de pie", 3)]),
            ("Día C", [("Prensa", 3), ("Fondos en paralelas", 3), ("Remo con mancuerna", 3),
                       ("Curl femoral", 3), ("Curl martillo", 2), ("Elevación de piernas colgado", 2)]),
        ],
    ),
    (
        "Fase 3 · 4 días",
        "Torso / Pierna: más volumen por grupo muscular.",
        False,
        [
            ("Torso A", [("Press banca", 4), ("Remo con barra", 4), ("Press de hombros con mancuernas", 3),
                         ("Jalón al pecho", 3), ("Curl con barra", 3), ("Extensión de tríceps en polea", 3)]),
            ("Pierna A", [("Sentadilla", 4), ("Peso muerto rumano", 3), ("Prensa", 3), ("Curl femoral", 3),
                          ("Gemelos de pie", 4), ("Crunch en polea", 3)]),
            ("Torso B", [("Press militar con barra", 4), ("Dominadas", 4), ("Press inclinado con mancuernas", 3),
                         ("Remo en polea baja", 3), ("Elevaciones laterales", 3), ("Curl martillo", 3),
                         ("Press francés", 3)]),
            ("Pierna B", [("Peso muerto", 3), ("Sentadilla búlgara", 3), ("Hip thrust", 3),
                          ("Extensión de cuádriceps", 3), ("Gemelos sentado", 4), ("Rueda abdominal", 3)]),
        ],
    ),
]


def sembrar(db: Session) -> None:
    if db.scalar(select(exists().where(Ejercicio.id.is_not(None)))):
        return
    por_nombre = {}
    for grupo, lista in EJERCICIOS.items():
        for nombre, tipo, reps_min, reps_max, incremento in lista:
            por_nombre[nombre] = Ejercicio(
                nombre=nombre, grupo=grupo, tipo=tipo, reps_min=reps_min, reps_max=reps_max, incremento_kg=incremento
            )
    db.add_all(por_nombre.values())
    for nombre, descripcion, activo, dias in PLANES:
        db.add(
            Plan(
                nombre=nombre,
                descripcion=descripcion,
                activo=activo,
                dias=[
                    DiaPlan(
                        orden=i,
                        nombre=nombre_dia,
                        ejercicios=[
                            EjercicioDelDia(ejercicio=por_nombre[ejercicio], orden=j, series=series)
                            for j, (ejercicio, series) in enumerate(ejercicios)
                        ],
                    )
                    for i, (nombre_dia, ejercicios) in enumerate(dias)
                ],
            )
        )
    db.commit()
