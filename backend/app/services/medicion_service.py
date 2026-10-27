from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NoEncontrado
from app.models import Medicion
from app.schemas.mediciones import MedicionIn


class MedicionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def listar(self) -> list[Medicion]:
        return list(self.db.scalars(select(Medicion).order_by(Medicion.fecha, Medicion.id)))

    def obtener(self, medicion_id: int) -> Medicion:
        medicion = self.db.get(Medicion, medicion_id)
        if medicion is None:
            raise NoEncontrado("La medición no existe")
        return medicion

    def crear(self, datos: MedicionIn) -> Medicion:
        medicion = Medicion()
        self._volcar(medicion, datos)
        self.db.add(medicion)
        self.db.commit()
        return medicion

    def reemplazar(self, medicion_id: int, datos: MedicionIn) -> Medicion:
        medicion = self.obtener(medicion_id)
        self._volcar(medicion, datos)
        self.db.commit()
        return medicion

    def eliminar(self, medicion_id: int) -> None:
        self.db.delete(self.obtener(medicion_id))
        self.db.commit()

    @staticmethod
    def _volcar(medicion: Medicion, datos: MedicionIn) -> None:
        for campo, valor in datos.model_dump(exclude={"notas"}).items():
            setattr(medicion, campo, valor)
        medicion.notas = (datos.notas or "").strip() or None
