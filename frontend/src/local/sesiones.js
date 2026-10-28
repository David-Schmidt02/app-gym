import { tipoDeSemana } from './ciclo';
import { agregar, borrar, guardar, leer, listar } from './db';
import { obtenerEjercicio } from './ejercicios';
import { hoy, lunes, sumarDias } from './fechas';
import { obtenerPlan, planActivo } from './planes';
import { sugerir } from './progresion';

export const SESIONES_DE_HISTORIAL = 3;

export async function listarSesiones(limite = 30, antesDe = null) {
  const todas = await listar('sesiones');
  let filtradas = todas.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  if (antesDe) {
    filtradas = filtradas.filter((s) => s.fecha < antesDe);
  }
  return filtradas.slice(0, limite);
}

export async function obtenerSesion(id) {
  const sesion = await leer('sesiones', Number(id));
  if (!sesion) throw new Error('El entrenamiento no existe');
  return sesion;
}

export async function crearSesion(datos) {
  if (!datos.series || datos.series.length === 0) {
    throw new Error('El entrenamiento debe tener al menos una serie');
  }

  // Verificar que todos los ejercicios existan
  for (const s of datos.series) {
    await obtenerEjercicio(s.ejercicio_id);
  }

  const tipo_semana = await tipoDeSemana(datos.fecha);

  const nueva = {
    fecha: datos.fecha,
    plan_id: datos.plan_id !== null && datos.plan_id !== undefined ? Number(datos.plan_id) : null,
    dia_orden: datos.dia_orden !== null && datos.dia_orden !== undefined ? Number(datos.dia_orden) : null,
    dia_nombre: (datos.dia_nombre || '').trim(),
    tipo_semana,
    notas: (datos.notas || '').trim() || null,
    series: datos.series.map((s, idx) => ({
      orden: idx,
      ejercicio_id: Number(s.ejercicio_id),
      peso_kg: Number(s.peso_kg),
      reps: Number(s.reps),
    })),
  };

  const id = await agregar('sesiones', nueva);
  nueva.id = id;
  return nueva;
}

export async function reemplazarSesion(id, datos) {
  const existente = await obtenerSesion(id);
  if (!datos.series || datos.series.length === 0) {
    throw new Error('El entrenamiento debe tener al menos una serie');
  }

  for (const s of datos.series) {
    await obtenerEjercicio(s.ejercicio_id);
  }

  const tipo_semana = await tipoDeSemana(datos.fecha);

  const actualizada = {
    id: existente.id,
    fecha: datos.fecha,
    plan_id: datos.plan_id !== null && datos.plan_id !== undefined ? Number(datos.plan_id) : null,
    dia_orden: datos.dia_orden !== null && datos.dia_orden !== undefined ? Number(datos.dia_orden) : null,
    dia_nombre: (datos.dia_nombre || '').trim(),
    tipo_semana,
    notas: (datos.notas || '').trim() || null,
    series: datos.series.map((s, idx) => ({
      orden: idx,
      ejercicio_id: Number(s.ejercicio_id),
      peso_kg: Number(s.peso_kg),
      reps: Number(s.reps),
    })),
  };

  await guardar('sesiones', actualizada);
  return actualizada;
}

export async function eliminarSesion(id) {
  await obtenerSesion(id);
  await borrar('sesiones', Number(id));
}

export async function sesionesDeLaSemana() {
  const inicio = lunes(hoy());
  const fin = sumarDias(inicio, 7);
  const todas = await listar('sesiones');
  return todas.filter((s) => s.fecha >= inicio && s.fecha < fin).length;
}

export async function diaSugeridoCola(plan) {
  if (!plan || !plan.dias || plan.dias.length === 0) return 0;
  const todas = await listar('sesiones');
  const deEstePlan = todas
    .filter((s) => s.plan_id === plan.id && s.dia_orden !== null && s.dia_orden !== undefined)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);

  if (deEstePlan.length === 0) return 0;
  const ultimoDia = deEstePlan[0].dia_orden;
  return (ultimoDia + 1) % plan.dias.length;
}

export async function historialEjercicio(ejercicioId) {
  const todas = await listar('sesiones');
  const relevantes = todas
    .filter(
      (s) =>
        s.tipo_semana !== 'descarga' &&
        s.series &&
        s.series.some((ser) => ser.ejercicio_id === Number(ejercicioId)),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
    .slice(0, SESIONES_DE_HISTORIAL);

  return relevantes.map((s) => ({
    fecha: s.fecha,
    series: s.series
      .filter((ser) => ser.ejercicio_id === Number(ejercicioId))
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
  }));
}

export async function entrenamiento(diaOrden, planId = null) {
  const plan = planId ? await obtenerPlan(planId) : await planActivo();
  if (!plan) throw new Error('No hay una rutina activa');

  const ordenNum = Number(diaOrden);
  if (ordenNum < 0 || ordenNum >= plan.dias.length) {
    throw new Error('La rutina no tiene ese día');
  }

  const dia = plan.dias[ordenNum];
  const semana = await tipoDeSemana(hoy());

  const ejercicios = [];
  for (const item of dia.ejercicios || []) {
    const historial = await historialEjercicio(item.ejercicio.id);
    const sugerencia = sugerir(
      item.ejercicio,
      item.series,
      semana,
      historial.map((h) => h.series),
    );

    ejercicios.push({
      ejercicio: item.ejercicio,
      series: item.series,
      ultima_vez: historial[0] || null,
      sugerencia,
    });
  }

  return {
    plan_id: plan.id,
    dia_orden: ordenNum,
    dia_nombre: dia.nombre,
    tipo_semana: semana,
    ejercicios,
  };
}
