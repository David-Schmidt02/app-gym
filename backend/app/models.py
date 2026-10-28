"""Modelos ORM. Los pesos van en kg con decimales (2,5 kg, 1,25 kg)."""
from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Grupo(StrEnum):
    PECHO = "pecho"
    ESPALDA = "espalda"
    HOMBROS = "hombros"
    BICEPS = "biceps"
    TRICEPS = "triceps"
    CUADRICEPS = "cuadriceps"
    ISQUIOS = "isquios"
    GEMELOS = "gemelos"
    CORE = "core"


class TipoEjercicio(StrEnum):
    """Los compuestos mueven varias articulaciones (sentadilla, banca); los aislados una sola (curl)."""

    COMPUESTO = "compuesto"
    AISLADO = "aislado"


class TipoSemana(StrEnum):
    ADAPTACION = "adaptacion"
    PROGRESION = "progresion"
    DESCARGA = "descarga"


def _enum(tipo: type[StrEnum]) -> Enum:
    """Guarda el valor del enum (ej. 'pecho') como texto, sin tipo nativo."""
    return Enum(tipo, native_enum=False, values_callable=lambda e: [m.value for m in e], length=20)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())


class Ejercicio(Base):
    """Un ejercicio del banco. El rango de repeticiones decide cuándo subir de peso."""

    __tablename__ = "ejercicios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(80), unique=True)
    grupo: Mapped[Grupo] = mapped_column(_enum(Grupo))
    tipo: Mapped[TipoEjercicio] = mapped_column(_enum(TipoEjercicio))
    reps_min: Mapped[int]
    reps_max: Mapped[int]
    incremento_kg: Mapped[float]
    notas: Mapped[str | None] = mapped_column(String(300))
    archivado: Mapped[bool] = mapped_column(default=False)


class Plan(Base):
    """Una rutina (ej. «Fase 1 · 2 días»). Solo una está activa."""

    __tablename__ = "planes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60))
    descripcion: Mapped[str | None] = mapped_column(String(300))
    activo: Mapped[bool] = mapped_column(default=False)
    descanso_dias: Mapped[int] = mapped_column(default=1)
    dias: Mapped[list["DiaPlan"]] = relationship(
        back_populates="plan", order_by="DiaPlan.orden", cascade="all, delete-orphan"
    )


class DiaPlan(Base):
    __tablename__ = "dias_plan"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("planes.id", ondelete="CASCADE"))
    orden: Mapped[int]
    nombre: Mapped[str] = mapped_column(String(40))
    dia_semana: Mapped[int | None] = mapped_column(default=None)
    plan: Mapped[Plan] = relationship(back_populates="dias")
    ejercicios: Mapped[list["EjercicioDelDia"]] = relationship(
        order_by="EjercicioDelDia.orden", cascade="all, delete-orphan"
    )


class AgendaDia(Base):
    """Excepción semanal de un día de rutina (reprogramado o salteado con fecha=None)."""

    __tablename__ = "agenda_semanal"
    __table_args__ = (UniqueConstraint("semana", "plan_id", "dia_orden"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    semana: Mapped[date]
    plan_id: Mapped[int] = mapped_column(ForeignKey("planes.id", ondelete="CASCADE"))
    dia_orden: Mapped[int]
    fecha: Mapped[date | None] = mapped_column(default=None)


class EjercicioDelDia(Base):
    __tablename__ = "ejercicios_del_dia"

    id: Mapped[int] = mapped_column(primary_key=True)
    dia_id: Mapped[int] = mapped_column(ForeignKey("dias_plan.id", ondelete="CASCADE"))
    ejercicio_id: Mapped[int] = mapped_column(ForeignKey("ejercicios.id"))
    orden: Mapped[int]
    series: Mapped[int]
    ejercicio: Mapped[Ejercicio] = relationship(lazy="joined")


class Ciclo(Base):
    """Fila única: el lunes en que empezó la semana 0 (adaptación). De ahí sale la semana actual."""

    __tablename__ = "ciclo"

    id: Mapped[int] = mapped_column(primary_key=True)
    inicio: Mapped[date]


class Sesion(Base):
    """Un entrenamiento. Guarda el nombre del día por si después se edita o se borra el plan."""

    __tablename__ = "sesiones"

    id: Mapped[int] = mapped_column(primary_key=True)
    fecha: Mapped[date]
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("planes.id", ondelete="SET NULL"))
    dia_orden: Mapped[int | None]
    dia_nombre: Mapped[str] = mapped_column(String(40))
    tipo_semana: Mapped[TipoSemana] = mapped_column(_enum(TipoSemana))
    notas: Mapped[str | None] = mapped_column(String(500))
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())
    series: Mapped[list["Serie"]] = relationship(
        order_by="Serie.orden", cascade="all, delete-orphan", lazy="selectin"
    )


class Serie(Base):
    __tablename__ = "series"

    id: Mapped[int] = mapped_column(primary_key=True)
    sesion_id: Mapped[int] = mapped_column(ForeignKey("sesiones.id", ondelete="CASCADE"))
    ejercicio_id: Mapped[int] = mapped_column(ForeignKey("ejercicios.id"))
    orden: Mapped[int]
    peso_kg: Mapped[float]
    reps: Mapped[int]
    ejercicio: Mapped[Ejercicio] = relationship(lazy="joined")


class Medicion(Base):
    """Peso corporal y medidas en cm. Cada campo es opcional: se anota lo que se midió ese día."""

    __tablename__ = "mediciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    fecha: Mapped[date]
    peso_kg: Mapped[float | None]
    cintura_cm: Mapped[float | None]
    cadera_cm: Mapped[float | None]
    pecho_cm: Mapped[float | None]
    brazo_cm: Mapped[float | None]
    muslo_cm: Mapped[float | None]
    notas: Mapped[str | None] = mapped_column(String(300))
