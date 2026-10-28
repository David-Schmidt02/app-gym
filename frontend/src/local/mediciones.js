import { agregar, borrar, guardar, leer, listar } from './db';

const CAMPOS = ['peso_kg', 'cintura_cm', 'cadera_cm', 'pecho_cm', 'brazo_cm', 'muslo_cm'];

function validarMedicion(datos) {
  const tieneAlgo = CAMPOS.some(
    (c) => datos[c] !== null && datos[c] !== undefined && !Number.isNaN(Number(datos[c])),
  );
  if (!tieneAlgo) {
    throw new Error('Anotá al menos el peso o una medida');
  }

  const obj = {
    fecha: datos.fecha,
    notas: (datos.notas || '').trim() || null,
  };

  for (const c of CAMPOS) {
    obj[c] = datos[c] !== null && datos[c] !== undefined && datos[c] !== '' ? Number(datos[c]) : null;
  }

  return obj;
}

export async function listarMediciones() {
  const todas = await listar('mediciones');
  return todas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
}

export async function obtenerMedicion(id) {
  const m = await leer('mediciones', Number(id));
  if (!m) throw new Error('La medición no existe');
  return m;
}

export async function crearMedicion(datos) {
  const obj = validarMedicion(datos);
  const id = await agregar('mediciones', obj);
  obj.id = id;
  return obj;
}

export async function reemplazarMedicion(id, datos) {
  const existente = await obtenerMedicion(id);
  const obj = validarMedicion(datos);
  obj.id = existente.id;
  await guardar('mediciones', obj);
  return obj;
}

export async function eliminarMedicion(id) {
  await obtenerMedicion(id);
  await borrar('mediciones', Number(id));
}
