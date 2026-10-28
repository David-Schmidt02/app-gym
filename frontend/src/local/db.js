/**
 * Persistencia en IndexedDB del cliente para funcionamiento 100 % Local-First y offline.
 */

const DB_NOMBRE = 'gym_local_db';
const DB_VERSION = 1;

let dbInstancia = null;

export function abrirDb() {
  if (dbInstancia) return Promise.resolve(dbInstancia);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('perfil')) {
        db.createObjectStore('perfil', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('ejercicios')) {
        const store = db.createObjectStore('ejercicios', { keyPath: 'id', autoIncrement: true });
        store.createIndex('nombre', 'nombre', { unique: true });
        store.createIndex('grupo', 'grupo', { unique: false });
      }

      if (!db.objectStoreNames.contains('planes')) {
        db.createObjectStore('planes', { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('sesiones')) {
        const store = db.createObjectStore('sesiones', { keyPath: 'id', autoIncrement: true });
        store.createIndex('fecha', 'fecha', { unique: false });
        store.createIndex('plan_id', 'plan_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('mediciones')) {
        const store = db.createObjectStore('mediciones', { keyPath: 'id', autoIncrement: true });
        store.createIndex('fecha', 'fecha', { unique: false });
      }

      if (!db.objectStoreNames.contains('agenda')) {
        const store = db.createObjectStore('agenda', { keyPath: 'id' });
        store.createIndex('semana', 'semana', { unique: false });
        store.createIndex('plan_id', 'plan_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('ciclo')) {
        db.createObjectStore('ciclo', { keyPath: 'id' });
      }
    };

    req.onsuccess = () => {
      dbInstancia = req.result;
      dbInstancia.onclose = () => {
        dbInstancia = null;
      };
      resolve(dbInstancia);
    };

    req.onerror = () => reject(req.error);
  });
}

export async function leer(store, id) {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listar(store) {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function guardar(store, valor) {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(valor);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function agregar(store, valor) {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(valor);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function borrar(store, id) {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function limpiar(store) {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function exportarBase() {
  const stores = ['perfil', 'ejercicios', 'planes', 'sesiones', 'mediciones', 'agenda', 'ciclo'];
  const resultado = {
    version: 1,
    exportado_en: new Date().toISOString(),
    datos: {},
  };
  for (const store of stores) {
    resultado.datos[store] = await listar(store);
  }
  return resultado;
}

export async function importarBase(datosCompletos) {
  if (!datosCompletos || typeof datosCompletos !== 'object' || !datosCompletos.datos) {
    throw new Error('El archivo no tiene el formato de respaldo de Gym');
  }
  const db = await abrirDb();
  const stores = ['perfil', 'ejercicios', 'planes', 'sesiones', 'mediciones', 'agenda', 'ciclo'];
  const tx = db.transaction(stores, 'readwrite');

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Importación cancelada'));

    for (const store of stores) {
      const s = tx.objectStore(store);
      s.clear();
      const registros = datosCompletos.datos[store] || [];
      for (const reg of registros) {
        s.put(reg);
      }
    }
  });
}
