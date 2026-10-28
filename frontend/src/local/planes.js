import { agregar, borrar, guardar, leer, listar } from './db';

async function obtenerMapaEjercicios() {
  const todos = await listar('ejercicios');
  const mapa = {};
  for (const e of todos) {
    mapa[e.id] = e;
  }
  return mapa;
}

export function hidratarPlan(plan, mapaEjercicios) {
  if (!plan) return null;
  return {
    ...plan,
    dias: (plan.dias || []).map((d) => ({
      ...d,
      ejercicios: (d.ejercicios || []).map((e) => ({
        series: e.series,
        ejercicio: mapaEjercicios[e.ejercicio_id] || {
          id: e.ejercicio_id,
          nombre: 'Ejercicio desconocido',
          grupo: 'pecho',
          tipo: 'compuesto',
          reps_min: 8,
          reps_max: 12,
          incremento_kg: 2.5,
          archivado: false,
        },
      })),
    })),
  };
}

export async function listarPlanes() {
  const [planes, mapaEjercicios] = await Promise.all([listar('planes'), obtenerMapaEjercicios()]);
  return planes
    .sort((a, b) => a.id - b.id)
    .map((p) => hidratarPlan(p, mapaEjercicios));
}

export async function obtenerPlan(id) {
  const plan = await leer('planes', Number(id));
  if (!plan) throw new Error('La rutina no existe');
  const mapaEjercicios = await obtenerMapaEjercicios();
  return hidratarPlan(plan, mapaEjercicios);
}

export async function planActivo() {
  const planes = await listar('planes');
  const activo = planes.find((p) => p.activo);
  if (!activo) return null;
  const mapaEjercicios = await obtenerMapaEjercicios();
  return hidratarPlan(activo, mapaEjercicios);
}

function validarPlan(datos, mapaEjercicios) {
  const nombre = (datos.nombre || '').trim();
  if (!nombre) throw new Error('El nombre de la rutina es obligatorio');

  const dias = datos.dias || [];
  if (dias.length === 0) throw new Error('La rutina debe tener al menos un día');

  const asignados = dias.filter((d) => d.dia_semana !== null && d.dia_semana !== undefined).map((d) => d.dia_semana);
  if (asignados.length > 0) {
    if (asignados.length !== dias.length) {
      throw new Error('Asigná un día de la semana a todos los días de la rutina o dejala libre');
    }
    const unicos = new Set(asignados);
    if (unicos.size !== asignados.length) {
      throw new Error('Dos días de la rutina no pueden compartir el mismo día de la semana');
    }
  }

  for (const dia of dias) {
    for (const ej of dia.ejercicios || []) {
      if (!mapaEjercicios[ej.ejercicio_id]) {
        throw new Error(`No existe el ejercicio ${ej.ejercicio_id}`);
      }
    }
  }

  return {
    nombre,
    descripcion: (datos.descripcion || '').trim() || null,
    descanso_dias: Number(datos.descanso_dias ?? 1),
    dias: dias.map((d, i) => ({
      orden: i,
      nombre: (d.nombre || '').trim(),
      dia_semana: d.dia_semana !== null && d.dia_semana !== undefined ? Number(d.dia_semana) : null,
      ejercicios: (d.ejercicios || []).map((e, j) => ({
        orden: j,
        series: Number(e.series || 3),
        ejercicio_id: Number(e.ejercicio_id),
      })),
    })),
  };
}

export async function crearPlan(datos) {
  const [planes, mapaEjercicios] = await Promise.all([listar('planes'), obtenerMapaEjercicios()]);
  const validado = validarPlan(datos, mapaEjercicios);
  const activo = planes.length === 0 || !planes.some((p) => p.activo);

  const nuevo = {
    ...validado,
    activo,
  };

  const id = await agregar('planes', nuevo);
  nuevo.id = id;
  return hidratarPlan(nuevo, mapaEjercicios);
}

export async function reemplazarPlan(id, datos) {
  const [planExistente, mapaEjercicios] = await Promise.all([obtenerPlan(id), obtenerMapaEjercicios()]);
  const validado = validarPlan(datos, mapaEjercicios);

  const actualizado = {
    ...validado,
    id: planExistente.id,
    activo: planExistente.activo,
  };

  // Limpiar ajustes de agenda para esta rutina
  const ajustes = await listar('agenda');
  for (const a of ajustes) {
    if (a.plan_id === planExistente.id) {
      await borrar('agenda', a.id);
    }
  }

  await guardar('planes', actualizado);
  return hidratarPlan(actualizado, mapaEjercicios);
}

export async function activarPlan(id) {
  const numId = Number(id);
  const planes = await listar('planes');
  let elegido = null;

  for (const p of planes) {
    if (p.id === numId) {
      p.activo = true;
      elegido = p;
    } else {
      p.activo = false;
    }
    await guardar('planes', p);
  }

  if (!elegido) throw new Error('La rutina no existe');
  const mapaEjercicios = await obtenerMapaEjercicios();
  return hidratarPlan(elegido, mapaEjercicios);
}

export async function eliminarPlan(id) {
  const plan = await obtenerPlan(id);
  if (plan.activo) {
    throw new Error('Es la rutina activa: activá otra antes de borrarla');
  }

  const ajustes = await listar('agenda');
  for (const a of ajustes) {
    if (a.plan_id === plan.id) {
      await borrar('agenda', a.id);
    }
  }

  await borrar('planes', plan.id);
}
