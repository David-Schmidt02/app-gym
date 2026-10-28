/**
 * Doble progresión: mismo peso hasta completar el tope del rango en todas las series, después subir.
 * Port 1:1 exacto de progresion.py en funciones puras sin dependencias externas.
 */

export const DESCARGA_PESO = 0.85;
export const ESTANCADO_PESO = 0.90;

export const Accion = {
  PRIMERA: 'primera',
  SUBIR: 'subir',
  MANTENER: 'mantener',
  BAJAR: 'bajar',
  DESCARGA: 'descarga',
};

export function redondear(peso, paso = 0.5) {
  return Math.floor(peso / paso + 1e-9) * paso;
}

export function pesoDeTrabajo(series) {
  if (!series || series.length === 0) return 0;
  return Math.max(...series.map((s) => s.peso_kg));
}

export function repsAlPeso(series, peso) {
  return series.filter((s) => s.peso_kg === peso).map((s) => s.reps);
}

function formatearKg(peso) {
  return String(peso).replace('.', ',');
}

export function estancado(historial, peso) {
  if (!historial || historial.length < 3) return false;
  const primerasTres = historial.slice(0, 3);
  if (primerasTres.some((sesion) => pesoDeTrabajo(sesion) !== peso)) {
    return false;
  }
  const [ultima, penultima, referencia] = primerasTres.map((sesion) =>
    repsAlPeso(sesion, peso).reduce((a, b) => a + b, 0),
  );
  return ultima < referencia && penultima < referencia;
}

export function sugerir(ejercicio, series, semana, historial) {
  const base = {
    series,
    reps_min: ejercicio.reps_min,
    reps_max: ejercicio.reps_max,
  };
  const reserva = semana === 'adaptacion' ? '3 o 4' : '2 o 3';

  if (!historial || historial.length === 0) {
    return {
      accion: Accion.PRIMERA,
      peso_kg: null,
      ...base,
      motivo: `Primera vez: elegí un peso con el que llegues a ${ejercicio.reps_max} reps dejando ${reserva} en reserva.`,
    };
  }

  const peso = pesoDeTrabajo(historial[0]);
  const reps = repsAlPeso(historial[0], peso);

  if (semana === 'descarga') {
    return {
      accion: Accion.DESCARGA,
      peso_kg: redondear(peso * DESCARGA_PESO),
      series: Math.max(1, Math.ceil(series / 2)),
      reps_min: ejercicio.reps_min,
      reps_max: ejercicio.reps_max,
      motivo: 'Semana de descarga: la mitad de las series y un 15 % menos de peso. Tiene que sentirse fácil.',
    };
  }

  if (reps.length >= series && Math.min(...reps) >= ejercicio.reps_max) {
    const nuevo = peso + ejercicio.incremento_kg;
    return {
      accion: Accion.SUBIR,
      peso_kg: nuevo,
      ...base,
      motivo: `La vez pasada llegaste a ${ejercicio.reps_max} en todas las series: subí ${formatearKg(ejercicio.incremento_kg)} kg y volvé a buscar ${ejercicio.reps_min}.`,
    };
  }

  if (estancado(historial, peso)) {
    return {
      accion: Accion.BAJAR,
      peso_kg: redondear(peso * ESTANCADO_PESO),
      ...base,
      motivo: 'Dos sesiones seguidas rindiendo menos que antes con este peso: bajá un 10 % y volvé a construir.',
    };
  }

  return {
    accion: Accion.MANTENER,
    peso_kg: peso,
    ...base,
    motivo: `Mismo peso: buscá sumar una rep (la vez pasada: ${reps.join(', ')}).`,
  };
}
