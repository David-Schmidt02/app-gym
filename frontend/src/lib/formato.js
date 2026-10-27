const kilos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
const DIAS = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const DIA_LARGO = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const CORTA = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const GRUPOS = [
  { valor: 'pecho', nombre: 'Pecho' },
  { valor: 'espalda', nombre: 'Espalda' },
  { valor: 'hombros', nombre: 'Hombros' },
  { valor: 'biceps', nombre: 'Bíceps' },
  { valor: 'triceps', nombre: 'Tríceps' },
  { valor: 'cuadriceps', nombre: 'Cuádriceps' },
  { valor: 'isquios', nombre: 'Isquios y glúteos' },
  { valor: 'gemelos', nombre: 'Gemelos' },
  { valor: 'core', nombre: 'Core' },
];

export const nombreGrupo = (valor) => GRUPOS.find((g) => g.valor === valor)?.nombre ?? valor;

export const SEMANAS = {
  adaptacion: { nombre: 'Adaptación', detalle: 'Pesos cómodos, dejando 3 o 4 reps en reserva, para encontrar desde dónde arrancar.' },
  progresion: { nombre: 'Progresión', detalle: 'Mismo peso hasta completar el tope del rango en todas las series; después, a subir.' },
  descarga: { nombre: 'Descarga', detalle: 'La mitad de las series y un 15 % menos de peso. Recuperarse también es entrenar.' },
};

/** "62,5" (sin unidad). */
export const kg = (peso) => kilos.format(peso ?? 0);

/** Interpreta lo que se tipea: "62,5" o "62.5". Devuelve null si no es un número válido. */
export function parsearNumero(texto) {
  const limpio = String(texto ?? '').trim().replace(',', '.');
  if (!limpio) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

/** Las fechas llegan como "2026-11-02"; se formatean en UTC para que no se corran de día. */
const comoFecha = (iso) => new Date(`${iso}T00:00:00Z`);
export const fechaCorta = (iso) => CORTA.format(comoFecha(iso));
export const fechaConDia = (iso) => DIAS.format(comoFecha(iso));
export const fechaLarga = (iso) => DIA_LARGO.format(comoFecha(iso));

/** Hoy en la zona del dispositivo, como "YYYY-MM-DD". */
export function hoyIso() {
  const ahora = new Date();
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** "3 × 10, 10, 9" agrupando las series por peso: "60 kg × 10, 10 · 62,5 kg × 8". */
export function resumirSeries(series) {
  const grupos = [];
  for (const s of series) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.peso === s.peso_kg) ultimo.reps.push(s.reps);
    else grupos.push({ peso: s.peso_kg, reps: [s.reps] });
  }
  return grupos.map((g) => `${kg(g.peso)} kg × ${g.reps.join(', ')}`).join(' · ');
}

export const rangoReps = (min, max) => (min === max ? `${min}` : `${min}–${max}`);
