import { despacharApi } from '../local/router';

const CLAVE_TOKEN = 'gym.token';

export class ErrorApi extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.status = status;
  }
}

export const token = {
  leer: () => {
    try {
      return localStorage.getItem(CLAVE_TOKEN) || 'sesion-local';
    } catch {
      return 'sesion-local';
    }
  },
  guardar: (valor) => {
    try {
      if (valor) localStorage.setItem(CLAVE_TOKEN, valor);
      else localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      // Sin storage la sesión dura lo que la pestaña
    }
  },
};

/** Arma "/ruta?a=1" ignorando parámetros vacíos. */
export function conParams(ruta, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, valor]) => valor !== null && valor !== undefined && valor !== ''),
  ).toString();
  return query ? `${ruta}?${query}` : ruta;
}

/**
 * Adaptador unificado: resuelve localmente con IndexedDB a través de router.js.
 */
export async function api(ruta, { method = 'GET', body } = {}) {
  try {
    return await despacharApi(ruta, { method, body });
  } catch (err) {
    throw new ErrorApi(err.message || 'Error en la libreta local', 400);
  }
}
