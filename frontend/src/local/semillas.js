import { agregar, guardar, leer, listar } from './db';
import { hoy, lunes } from './fechas';

const C = 'compuesto';
const A = 'aislado';

export const EJERCICIOS_SEMILLA = {
  pecho: [
    ['Press banca', C, 6, 10, 2.5],
    ['Press inclinado con mancuernas', C, 8, 12, 2],
    ['Fondos en paralelas', C, 6, 12, 2.5],
    ['Aperturas con mancuernas', A, 10, 15, 1],
    ['Cruce de poleas', A, 12, 15, 2.5],
  ],
  espalda: [
    ['Remo con barra', C, 6, 10, 2.5],
    ['Jalón al pecho', C, 8, 12, 2.5],
    ['Dominadas', C, 5, 10, 2.5],
    ['Remo con mancuerna', C, 8, 12, 2],
    ['Remo en polea baja', C, 10, 12, 2.5],
  ],
  hombros: [
    ['Press militar con barra', C, 6, 10, 2.5],
    ['Press de hombros con mancuernas', C, 8, 12, 2],
    ['Elevaciones laterales', A, 12, 15, 1],
    ['Face pull', A, 12, 15, 2.5],
    ['Pájaros con mancuernas', A, 12, 15, 1],
  ],
  biceps: [
    ['Curl con barra', A, 8, 12, 2.5],
    ['Curl con mancuernas', A, 10, 12, 1],
    ['Curl martillo', A, 10, 12, 1],
    ['Curl en polea', A, 12, 15, 2.5],
  ],
  triceps: [
    ['Extensión de tríceps en polea', A, 10, 15, 2.5],
    ['Press francés', A, 8, 12, 2.5],
    ['Extensión sobre la cabeza con mancuerna', A, 10, 12, 1],
    ['Fondos entre bancos', A, 10, 15, 2.5],
  ],
  cuadriceps: [
    ['Sentadilla', C, 6, 10, 5],
    ['Prensa', C, 10, 12, 10],
    ['Sentadilla búlgara', C, 8, 12, 2],
    ['Zancadas', C, 10, 12, 2],
    ['Extensión de cuádriceps', A, 12, 15, 5],
  ],
  isquios: [
    ['Peso muerto rumano', C, 6, 10, 5],
    ['Peso muerto', C, 5, 8, 5],
    ['Hip thrust', C, 8, 12, 5],
    ['Curl femoral', A, 10, 15, 5],
  ],
  gemelos: [
    ['Gemelos de pie', A, 10, 15, 5],
    ['Gemelos sentado', A, 12, 20, 5],
  ],
  core: [
    ['Crunch en polea', A, 10, 15, 2.5],
    ['Elevación de piernas colgado', A, 8, 15, 2.5],
    ['Rueda abdominal', A, 8, 12, 2.5],
    ['Pallof press', A, 10, 12, 2.5],
  ],
};

export const DIAS_POR_CANTIDAD = {
  1: [2],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export const PLANES_SEMILLA = [
  {
    nombre: 'Fase 1 · 2 días',
    descripcion: 'Cuerpo completo dos veces por semana, para volver a ponerse en forma. Un día libre entre A y B.',
    activo: true,
    descanso_dias: 1,
    dias: [
      {
        nombre: 'Día A',
        ejercicios: [
          ['Sentadilla', 3],
          ['Press banca', 3],
          ['Remo con barra', 3],
          ['Elevaciones laterales', 3],
          ['Curl con barra', 2],
          ['Crunch en polea', 2],
        ],
      },
      {
        nombre: 'Día B',
        ejercicios: [
          ['Peso muerto rumano', 3],
          ['Press militar con barra', 3],
          ['Jalón al pecho', 3],
          ['Press inclinado con mancuernas', 3],
          ['Extensión de tríceps en polea', 2],
          ['Gemelos de pie', 2],
        ],
      },
    ],
  },
  {
    nombre: 'Fase 2 · 3 días',
    descripcion: 'Cuerpo completo A / B / C, por ejemplo lunes, miércoles y viernes.',
    activo: false,
    descanso_dias: 1,
    dias: [
      {
        nombre: 'Día A',
        ejercicios: [
          ['Sentadilla', 3],
          ['Press banca', 3],
          ['Remo con barra', 3],
          ['Elevaciones laterales', 3],
          ['Curl con barra', 2],
          ['Crunch en polea', 2],
        ],
      },
      {
        nombre: 'Día B',
        ejercicios: [
          ['Peso muerto rumano', 3],
          ['Press militar con barra', 3],
          ['Jalón al pecho', 3],
          ['Press inclinado con mancuernas', 3],
          ['Extensión de tríceps en polea', 3],
          ['Gemelos de pie', 3],
        ],
      },
      {
        nombre: 'Día C',
        ejercicios: [
          ['Prensa', 3],
          ['Fondos en paralelas', 3],
          ['Remo con mancuerna', 3],
          ['Curl femoral', 3],
          ['Curl martillo', 2],
          ['Elevación de piernas colgado', 2],
        ],
      },
    ],
  },
  {
    nombre: 'Fase 3 · 4 días',
    descripcion: 'Torso / Pierna: más volumen por grupo muscular.',
    activo: false,
    descanso_dias: 1,
    dias: [
      {
        nombre: 'Torso A',
        ejercicios: [
          ['Press banca', 4],
          ['Remo con barra', 4],
          ['Press de hombros con mancuernas', 3],
          ['Jalón al pecho', 3],
          ['Curl con barra', 3],
          ['Extensión de tríceps en polea', 3],
        ],
      },
      {
        nombre: 'Pierna A',
        ejercicios: [
          ['Sentadilla', 4],
          ['Peso muerto rumano', 3],
          ['Prensa', 3],
          ['Curl femoral', 3],
          ['Gemelos de pie', 4],
          ['Crunch en polea', 3],
        ],
      },
      {
        nombre: 'Torso B',
        ejercicios: [
          ['Press militar con barra', 4],
          ['Dominadas', 4],
          ['Press inclinado con mancuernas', 3],
          ['Remo en polea baja', 3],
          ['Elevaciones laterales', 3],
          ['Curl martillo', 3],
          ['Press francés', 3],
        ],
      },
      {
        nombre: 'Pierna B',
        ejercicios: [
          ['Peso muerto', 3],
          ['Sentadilla búlgara', 3],
          ['Hip thrust', 3],
          ['Extensión de cuádriceps', 3],
          ['Gemelos sentado', 4],
          ['Rueda abdominal', 3],
        ],
      },
    ],
  },
];

export async function sembrarSiVacio() {
  const existentes = await listar('ejercicios');
  if (existentes.length > 0) return;

  const perfil = await leer('perfil', 'usuario');
  if (!perfil) {
    await guardar('perfil', { id: 'usuario', nombre: 'David', email: 'david@gym.local' });
  }

  const ciclo = await leer('ciclo', 1);
  if (!ciclo) {
    await guardar('ciclo', { id: 1, inicio: lunes(hoy()) });
  }

  const mapaPorNombre = {};
  for (const [grupo, lista] of Object.entries(EJERCICIOS_SEMILLA)) {
    for (const [nombre, tipo, reps_min, reps_max, incremento_kg] of lista) {
      const id = await agregar('ejercicios', {
        nombre,
        grupo,
        tipo,
        reps_min,
        reps_max,
        incremento_kg,
        notas: null,
        archivado: false,
      });
      mapaPorNombre[nombre] = { id, nombre, grupo, tipo, reps_min, reps_max, incremento_kg, notas: null, archivado: false };
    }
  }

  for (const p of PLANES_SEMILLA) {
    const sugeridos = DIAS_POR_CANTIDAD[p.dias.length] || [];
    await agregar('planes', {
      nombre: p.nombre,
      descripcion: p.descripcion,
      activo: p.activo,
      descanso_dias: p.descanso_dias,
      dias: p.dias.map((d, i) => ({
        orden: i,
        nombre: d.nombre,
        dia_semana: sugeridos[i] ?? null,
        ejercicios: d.ejercicios.map(([nombreEj, series], j) => ({
          orden: j,
          series,
          ejercicio_id: mapaPorNombre[nombreEj]?.id,
        })),
      })),
    });
  }
}
