/**
 * Utilidades de fechas ISO ("YYYY-MM-DD") para la lógica local de entrenamiento y agenda.
 * Se manejan en tiempo local del dispositivo sin desfase UTC.
 */

export function hoy() {
  const ahora = new Date();
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function parsearFecha(iso) {
  const [año, mes, dia] = iso.split('-').map(Number);
  return new Date(año, mes - 1, dia);
}

export function formatearFecha(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

export function sumarDias(iso, dias) {
  const d = parsearFecha(iso);
  d.setDate(d.getDate() + dias);
  return formatearFecha(d);
}

/** Lunes de la semana que contiene a la fecha dada (Lunes = 0, Domingo = 6). */
export function lunes(iso) {
  const d = parsearFecha(iso);
  const diaSemana = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diaSemana);
  return formatearFecha(d);
}

/** Diferencia en días enteros (fecha2 - fecha1). */
export function diferenciaDias(iso1, iso2) {
  const d1 = parsearFecha(iso1);
  const d2 = parsearFecha(iso2);
  const ms = d2.getTime() - d1.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
