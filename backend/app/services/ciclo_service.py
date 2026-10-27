from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.fechas import hoy, lunes
from app.models import Ciclo, TipoSemana
from app.schemas.ciclo import CicloOut

SEMANAS_POR_BLOQUE = 5  # 4 de progresión y la última de descarga


def describir(semana: int, inicio: date) -> CicloOut:
    """Semana 0 = adaptación; después bloques de 5 semanas cuya última es de descarga."""
    if semana == 0:
        tipo, bloque, del_bloque = TipoSemana.ADAPTACION, 0, 0
    else:
        bloque, resto = divmod(semana - 1, SEMANAS_POR_BLOQUE)
        bloque, del_bloque = bloque + 1, resto + 1
        tipo = TipoSemana.DESCARGA if del_bloque == SEMANAS_POR_BLOQUE else TipoSemana.PROGRESION
    descarga = None if tipo == TipoSemana.DESCARGA else semana + SEMANAS_POR_BLOQUE - del_bloque
    return CicloOut(
        semana=semana,
        tipo=tipo,
        bloque=bloque,
        semana_del_bloque=del_bloque,
        inicio_semana=inicio + timedelta(weeks=semana),
        proxima_descarga=None if descarga is None else inicio + timedelta(weeks=descarga),
    )


class CicloService:
    """La semana del ciclo sale del calendario: cada lunes avanza una."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def estado(self, dia: date | None = None) -> CicloOut:
        inicio = self._fila().inicio
        semana = max(0, (lunes(dia or hoy()) - inicio).days // 7)
        return describir(semana, inicio)

    def tipo_de(self, dia: date) -> TipoSemana:
        return self.estado(dia).tipo

    def fijar(self, semana: int) -> CicloOut:
        """Corre el inicio para que esta semana sea la pedida (para retomar o saltear una descarga)."""
        self._fila().inicio = lunes(hoy()) - timedelta(weeks=semana)
        self.db.commit()
        return self.estado()

    def _fila(self) -> Ciclo:
        fila = self.db.get(Ciclo, 1)
        if fila is None:
            fila = Ciclo(id=1, inicio=lunes(hoy()))
            self.db.add(fila)
            self.db.commit()
        return fila
