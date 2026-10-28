import { agregar, borrar, guardar, leer, listar } from './db';

const ORDEN_GRUPOS = {
  pecho: 0,
  espalda: 1,
  hombros: 2,
  biceps: 3,
  triceps: 4,
  cuadriceps: 5,
  isquios: 6,
  gemelos: 7,
  core: 8,
};

export function unoRm(peso, reps) {
  if (!reps) return peso;
  return Math.round(peso * (1 + reps / 30) * 10) / 10;
}

export async function listarEjercicios() {
  const todos = await listar('ejercicios');
  return todos.sort((a, b) => {
    const ga = ORDEN_GRUPOS[a.grupo] ?? 99;
    const gb = ORDEN_GRUPOS[b.grupo] ?? 99;
    if (ga !== gb) return ga - gb;
    return a.nombre.localeCompare(b.nombre);
  });
}

export async function obtenerEjercicio(id) {
  const ej = await leer('ejercicios', Number(id));
  if (!ej) throw new Error('El ejercicio no existe');
  return ej;
}

export async function crearEjercicio(datos) {
  const nombre = (datos.nombre || '').trim();
  if (!nombre) throw new Error('El nombre es obligatorio');

  const todos = await listar('ejercicios');
  if (todos.some((e) => e.nombre.toLowerCase() === nombre.toLowerCase())) {
    throw new Error(`Ya existe «${nombre}»`);
  }

  if (datos.reps_min > datos.reps_max) {
    throw new Error('El mínimo de repeticiones no puede superar al máximo');
  }

  const nuevo = {
    nombre,
    grupo: datos.grupo,
    tipo: datos.tipo,
    reps_min: Number(datos.reps_min),
    reps_max: Number(datos.reps_max),
    incremento_kg: Number(datos.incremento_kg),
    notas: (datos.notas || '').trim() || null,
    archivado: false,
  };

  const id = await agregar('ejercicios', nuevo);
  nuevo.id = id;
  return nuevo;
}

export async function actualizarEjercicio(id, datos) {
  const ej = await obtenerEjercicio(id);
  const todos = await listar('ejercicios');

  if (datos.nombre) {
    const nombre = datos.nombre.trim();
    if (todos.some((e) => e.id !== ej.id && e.nombre.toLowerCase() === nombre.toLowerCase())) {
      throw new Error(`Ya existe «${nombre}»`);
    }
    ej.nombre = nombre;
  }

  if (datos.grupo !== undefined) ej.grupo = datos.grupo;
  if (datos.tipo !== undefined) ej.tipo = datos.tipo;
  if (datos.reps_min !== undefined) ej.reps_min = Number(datos.reps_min);
  if (datos.reps_max !== undefined) ej.reps_max = Number(datos.reps_max);
  if (datos.incremento_kg !== undefined) ej.incremento_kg = Number(datos.incremento_kg);
  if (datos.notas !== undefined) ej.notas = (datos.notas || '').trim() || null;
  if (datos.archivado !== undefined) ej.archivado = Boolean(datos.archivado);

  if (ej.reps_min > ej.reps_max) {
    throw new Error('El mínimo de repeticiones no puede superar al máximo');
  }

  await guardar('ejercicios', ej);
  return ej;
}

export async function eliminarEjercicio(id) {
  const ej = await obtenerEjercicio(id);

  const sesiones = await listar('sesiones');
  const enSesiones = sesiones.some((s) => s.series && s.series.some((ser) => ser.ejercicio_id === ej.id));
  if (enSesiones) {
    throw new Error('Tiene entrenamientos guardados: archivalo para conservar el historial');
  }

  const planes = await listar('planes');
  const enPlanes = planes.some((p) =>
    p.dias && p.dias.some((d) => d.ejercicios && d.ejercicios.some((e) => e.ejercicio_id === ej.id)),
  );
  if (enPlanes) {
    throw new Error('Está en una rutina: sacalo de la rutina primero');
  }

  await borrar('ejercicios', ej.id);
}

export async function progresoEjercicio(id) {
  const ej = await obtenerEjercicio(id);
  const todasSesiones = await listar('sesiones');

  const puntos = [];
  const sesionesConEj = todasSesiones
    .filter((s) => s.series && s.series.some((ser) => ser.ejercicio_id === ej.id))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);

  for (const sesion of sesionesConEj) {
    const seriesEj = sesion.series.filter((ser) => ser.ejercicio_id === ej.id);
    if (seriesEj.length === 0) continue;

    const peso = Math.max(...seriesEj.map((s) => s.peso_kg));
    const reps = Math.max(...seriesEj.filter((s) => s.peso_kg === peso).map((s) => s.reps));
    const maxUnoRm = Math.max(...seriesEj.map((s) => unoRm(s.peso_kg, s.reps)));
    const volumen = Math.round(seriesEj.reduce((acc, s) => acc + s.peso_kg * s.reps, 0) * 10) / 10;

    puntos.push({
      fecha: sesion.fecha,
      peso_kg: peso,
      reps,
      uno_rm: maxUnoRm,
      volumen,
      descarga: sesion.tipo_semana === 'descarga',
    });
  }

  const normales = puntos.filter((p) => !p.descarga);
  let recordPeso = null;
  let recordUnoRm = null;

  if (normales.length > 0) {
    recordPeso = [...normales].sort((a, b) => {
      if (b.peso_kg !== a.peso_kg) return b.peso_kg - a.peso_kg;
      return b.reps - a.reps;
    })[0];

    recordUnoRm = [...normales].sort((a, b) => b.uno_rm - a.uno_rm)[0];
  }

  return {
    ejercicio: ej,
    puntos,
    record_peso: recordPeso,
    record_uno_rm: recordUnoRm,
  };
}
