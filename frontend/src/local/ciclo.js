import { guardar, leer } from './db';
import { diferenciaDias, hoy, lunes, sumarDias } from './fechas';

export const SEMANAS_POR_BLOQUE = 5;

export function describir(semana, inicio) {
  let tipo, bloque, delBloque;

  if (semana === 0) {
    tipo = 'adaptacion';
    bloque = 0;
    delBloque = 0;
  } else {
    bloque = Math.floor((semana - 1) / SEMANAS_POR_BLOQUE) + 1;
    const resto = (semana - 1) % SEMANAS_POR_BLOQUE;
    delBloque = resto + 1;
    tipo = delBloque === SEMANAS_POR_BLOQUE ? 'descarga' : 'progresion';
  }

  const descarga = tipo === 'descarga' ? null : semana + SEMANAS_POR_BLOQUE - delBloque;

  return {
    semana,
    tipo,
    bloque,
    semana_del_bloque: delBloque,
    inicio_semana: sumarDias(inicio, semana * 7),
    proxima_descarga: descarga === null ? null : sumarDias(inicio, descarga * 7),
  };
}

export async function obtenerFilaCiclo() {
  let fila = await leer('ciclo', 1);
  if (!fila) {
    fila = { id: 1, inicio: lunes(hoy()) };
    await guardar('ciclo', fila);
  }
  return fila;
}

export async function estadoCiclo(diaIso = null) {
  const { inicio } = await obtenerFilaCiclo();
  const fechaReferencia = lunes(diaIso || hoy());
  const diasDif = diferenciaDias(inicio, fechaReferencia);
  const semana = Math.max(0, Math.floor(diasDif / 7));
  return describir(semana, inicio);
}

export async function tipoDeSemana(diaIso) {
  const est = await estadoCiclo(diaIso);
  return est.tipo;
}

export async function fijarCiclo(semana) {
  const nuevoInicio = sumarDias(lunes(hoy()), -semana * 7);
  await guardar('ciclo', { id: 1, inicio: nuevoInicio });
  return estadoCiclo();
}
