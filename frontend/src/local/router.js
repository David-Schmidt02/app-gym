import { diaSugeridoAgenda, moverDiaAgenda, restaurarSemanaAgenda, semanaActual } from './agenda';
import { estadoCiclo, fijarCiclo } from './ciclo';
import { exportarBase, guardar, importarBase, leer } from './db';
import {
  actualizarEjercicio,
  crearEjercicio,
  eliminarEjercicio,
  listarEjercicios,
  obtenerEjercicio,
  progresoEjercicio,
} from './ejercicios';
import {
  activarPlan,
  crearPlan,
  eliminarPlan,
  listarPlanes,
  obtenerPlan,
  planActivo,
  reemplazarPlan,
} from './planes';
import { sembrarSiVacio } from './semillas';
import {
  crearSesion,
  diaSugeridoCola,
  eliminarSesion,
  entrenamiento,
  listarSesiones,
  obtenerSesion,
  reemplazarSesion,
  sesionesDeLaSemana,
} from './sesiones';
import {
  crearMedicion,
  eliminarMedicion,
  listarMediciones,
  obtenerMedicion,
  reemplazarMedicion,
} from './mediciones';

let sembradoIniciado = false;
async function asegurarSemillas() {
  if (sembradoIniciado) return;
  sembradoIniciado = true;
  await sembrarSiVacio();
}

/**
 * Despacha solicitudes a la base local IndexedDB con la misma interfaz que la API REST.
 */
export async function despacharApi(ruta, { method = 'GET', body } = {}) {
  await asegurarSemillas();

  const [path, queryStr] = ruta.split('?');
  const query = new URLSearchParams(queryStr || '');
  const segmentos = path.replace(/^\/+|\/+$/g, '').split('/');
  const recurso = segmentos[0];
  const id = segmentos[1];
  const subRecurso = segmentos[2];

  // Auth / Perfil
  if (recurso === 'auth') {
    if (id === 'yo' || id === 'login' || id === 'registro') {
      let perfil = await leer('perfil', 'usuario');
      if (!perfil) {
        perfil = { id: 'usuario', nombre: 'David', email: 'david@gym.local' };
        await guardar('perfil', perfil);
      }
      return id === 'yo' ? perfil : { token: 'token-local', usuario: perfil };
    }
  }

  if (recurso === 'perfil' && method === 'PUT') {
    let perfil = (await leer('perfil', 'usuario')) || { id: 'usuario', email: 'david@gym.local' };
    perfil = { ...perfil, ...body, id: 'usuario' };
    await guardar('perfil', perfil);
    return perfil;
  }

  // Backup
  if (recurso === 'backup') {
    if (method === 'GET') {
      return await exportarBase();
    }
    if (method === 'POST' && id === 'importar') {
      await importarBase(body);
      return { ok: true };
    }
  }

  // Hoy
  if (recurso === 'hoy' && method === 'GET') {
    const ciclo = await estadoCiclo();
    const plan = await planActivo();
    const semana = plan && plan.dias && plan.dias.length > 0 ? await semanaActual(plan) : null;
    const sesiones_semana = await sesionesDeLaSemana();
    let dia_sugerido = null;
    if (plan && plan.dias && plan.dias.length > 0 && semana) {
      const cola = await diaSugeridoCola(plan);
      dia_sugerido = diaSugeridoAgenda(plan, semana, cola);
    }
    return {
      ciclo,
      plan,
      dia_sugerido,
      sesiones_semana,
      semana,
    };
  }

  // Entrenar
  if (recurso === 'entrenar' && method === 'GET') {
    const diaOrden = Number(id);
    const planId = query.get('plan_id') ? Number(query.get('plan_id')) : null;
    return await entrenamiento(diaOrden, planId);
  }

  // Sesiones
  if (recurso === 'sesiones') {
    if (method === 'GET' && !id) {
      const limite = query.get('limite') ? Number(query.get('limite')) : 30;
      const antesDe = query.get('antes_de') || null;
      return await listarSesiones(limite, antesDe);
    }
    if (method === 'POST' && !id) {
      return await crearSesion(body);
    }
    if (method === 'GET' && id) {
      return await obtenerSesion(id);
    }
    if (method === 'PUT' && id) {
      return await reemplazarSesion(id, body);
    }
    if (method === 'DELETE' && id) {
      await eliminarSesion(id);
      return null;
    }
  }

  // Ejercicios
  if (recurso === 'ejercicios') {
    if (method === 'GET' && !id) {
      return await listarEjercicios();
    }
    if (method === 'POST' && !id) {
      return await crearEjercicio(body);
    }
    if (method === 'GET' && id && !subRecurso) {
      return await obtenerEjercicio(id);
    }
    if (method === 'PATCH' && id) {
      return await actualizarEjercicio(id, body);
    }
    if (method === 'DELETE' && id) {
      await eliminarEjercicio(id);
      return null;
    }
    if (method === 'GET' && id && subRecurso === 'progreso') {
      return await progresoEjercicio(id);
    }
  }

  // Planes
  if (recurso === 'planes') {
    if (method === 'GET' && !id) {
      return await listarPlanes();
    }
    if (method === 'POST' && !id) {
      return await crearPlan(body);
    }
    if (method === 'GET' && id && !subRecurso) {
      return await obtenerPlan(id);
    }
    if (method === 'PUT' && id && !subRecurso) {
      return await reemplazarPlan(id, body);
    }
    if (method === 'POST' && id && subRecurso === 'activar') {
      return await activarPlan(id);
    }
    if (method === 'DELETE' && id) {
      await eliminarPlan(id);
      return null;
    }
  }

  // Mediciones
  if (recurso === 'mediciones') {
    if (method === 'GET' && !id) {
      return await listarMediciones();
    }
    if (method === 'POST' && !id) {
      return await crearMedicion(body);
    }
    if (method === 'GET' && id) {
      return await obtenerMedicion(id);
    }
    if (method === 'PUT' && id) {
      return await reemplazarMedicion(id, body);
    }
    if (method === 'DELETE' && id) {
      await eliminarMedicion(id);
      return null;
    }
  }

  // Ciclo
  if (recurso === 'ciclo') {
    if (method === 'GET') {
      return await estadoCiclo();
    }
    if (method === 'PUT') {
      return await fijarCiclo(body.semana);
    }
  }

  // Agenda
  if (recurso === 'agenda') {
    const plan = await planActivo();
    if (method === 'PUT' && id === 'dia') {
      return await moverDiaAgenda(plan, body);
    }
    if (method === 'DELETE' && id === 'semana') {
      return await restaurarSemanaAgenda(plan);
    }
  }

  throw new Error(`Ruta no implementada: ${method} ${ruta}`);
}
