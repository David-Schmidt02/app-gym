from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.exceptions import NoEncontrado, ReglaDeNegocio
from app.models import DiaPlan, Ejercicio, EjercicioDelDia, Plan
from app.schemas.planes import PlanIn


class PlanService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def listar(self) -> list[Plan]:
        return list(self.db.scalars(select(Plan).order_by(Plan.id)).unique())

    def obtener(self, plan_id: int) -> Plan:
        plan = self.db.get(Plan, plan_id)
        if plan is None:
            raise NoEncontrado("La rutina no existe")
        return plan

    def activo(self) -> Plan | None:
        return self.db.scalar(select(Plan).where(Plan.activo))

    def crear(self, datos: PlanIn) -> Plan:
        plan = Plan(activo=self.activo() is None)
        self.db.add(plan)
        self._volcar(plan, datos)
        self.db.commit()
        return plan

    def reemplazar(self, plan_id: int, datos: PlanIn) -> Plan:
        """Los entrenamientos ya hechos no cambian: guardan el nombre del día y sus series."""
        plan = self.obtener(plan_id)
        plan.dias.clear()
        self.db.flush()
        self._volcar(plan, datos)
        self.db.commit()
        return plan

    def activar(self, plan_id: int) -> Plan:
        plan = self.obtener(plan_id)
        self.db.execute(update(Plan).values(activo=False))
        plan.activo = True
        self.db.commit()
        return plan

    def eliminar(self, plan_id: int) -> None:
        plan = self.obtener(plan_id)
        if plan.activo:
            raise ReglaDeNegocio("Es la rutina activa: activá otra antes de borrarla")
        self.db.delete(plan)
        self.db.commit()

    def _volcar(self, plan: Plan, datos: PlanIn) -> None:
        ids = {e.ejercicio_id for dia in datos.dias for e in dia.ejercicios}
        existentes = set(self.db.scalars(select(Ejercicio.id).where(Ejercicio.id.in_(ids))))
        if faltan := ids - existentes:
            raise NoEncontrado(f"No existen los ejercicios {sorted(faltan)}")
        plan.nombre = datos.nombre.strip()
        plan.descripcion = (datos.descripcion or "").strip() or None
        plan.dias = [
            DiaPlan(
                orden=i,
                nombre=dia.nombre.strip(),
                ejercicios=[
                    EjercicioDelDia(ejercicio_id=e.ejercicio_id, orden=j, series=e.series)
                    for j, e in enumerate(dia.ejercicios)
                ],
            )
            for i, dia in enumerate(datos.dias)
        ]
        self.db.flush()
        self.db.expire(plan, ["dias"])
