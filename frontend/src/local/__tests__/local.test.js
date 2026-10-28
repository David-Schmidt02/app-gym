import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { moverDiaAgenda, restaurarSemanaAgenda, semanaActual } from '../agenda';
import { describir, estadoCiclo, fijarCiclo } from '../ciclo';
import { exportarBase, importarBase, limpiar, listar } from '../db';
import {
  actualizarEjercicio,
  crearEjercicio,
  eliminarEjercicio,
  listarEjercicios,
  obtenerEjercicio,
  progresoEjercicio,
  unoRm,
} from '../ejercicios';
import { hoy, lunes, sumarDias } from '../fechas';
import { crearMedicion, eliminarMedicion, listarMediciones } from '../mediciones';
import { listarPlanes, planActivo } from '../planes';
import { Accion, redondear, sugerir } from '../progresion';
import { sembrarSiVacio } from '../semillas';
import { crearSesion, eliminarSesion, listarSesiones, sesionesDeLaSemana } from '../sesiones';

describe('Local-First Engine Tests', () => {
  beforeEach(async () => {
    const stores = ['perfil', 'ejercicios', 'planes', 'sesiones', 'mediciones', 'agenda', 'ciclo'];
    for (const s of stores) {
      await limpiar(s);
    }
  });

  describe('Semillas y arranque', () => {
    it('siembra la base vacía con ejercicios, rutinas y ciclo inicial', async () => {
      await sembrarSiVacio();
      const ejercicios = await listarEjercicios();
      const planes = await listarPlanes();
      const ciclo = await estadoCiclo();

      expect(ejercicios.length).toBeGreaterThan(20);
      expect(planes.length).toBe(3);
      expect(planes.some((p) => p.activo)).toBe(true);
      expect(ciclo.semana).toBe(0);
      expect(ciclo.tipo).toBe('adaptacion');
    });
  });

  describe('Doble progresión', () => {
    const ejCompuesto = {
      id: 1,
      nombre: 'Press banca',
      reps_min: 6,
      reps_max: 10,
      incremento_kg: 2.5,
    };

    it('sugiere peso inicial con reserva en la primera sesión', () => {
      const res = sugerir(ejCompuesto, 3, 'adaptacion', []);
      expect(res.accion).toBe(Accion.PRIMERA);
      expect(res.peso_kg).toBeNull();
      expect(res.motivo).toContain('dejando 3 o 4 en reserva');
    });

    it('sugiere subir peso cuando completó el tope de repeticiones en todas las series', () => {
      const historial = [
        [
          { peso_kg: 80, reps: 10 },
          { peso_kg: 80, reps: 10 },
          { peso_kg: 80, reps: 10 },
        ],
      ];
      const res = sugerir(ejCompuesto, 3, 'progresion', historial);
      expect(res.accion).toBe(Accion.SUBIR);
      expect(res.peso_kg).toBe(82.5);
    });

    it('sugiere mantener peso cuando aún no completó el tope', () => {
      const historial = [
        [
          { peso_kg: 80, reps: 10 },
          { peso_kg: 80, reps: 9 },
          { peso_kg: 80, reps: 8 },
        ],
      ];
      const res = sugerir(ejCompuesto, 3, 'progresion', historial);
      expect(res.accion).toBe(Accion.MANTENER);
      expect(res.peso_kg).toBe(80);
    });

    it('reduce series y peso en semana de descarga', () => {
      const historial = [
        [
          { peso_kg: 100, reps: 8 },
          { peso_kg: 100, reps: 8 },
          { peso_kg: 100, reps: 8 },
        ],
      ];
      const res = sugerir(ejCompuesto, 3, 'descarga', historial);
      expect(res.accion).toBe(Accion.DESCARGA);
      expect(res.peso_kg).toBe(redondear(100 * 0.85)); // 85 kg
      expect(res.series).toBe(2);
    });
  });

  describe('Ciclo y semanas', () => {
    it('calcula bloques y semanas de descarga cada 5 semanas', () => {
      const inicio = '2026-10-05';
      expect(describir(0, inicio).tipo).toBe('adaptacion');
      expect(describir(1, inicio).tipo).toBe('progresion');
      expect(describir(1, inicio).semana_del_bloque).toBe(1);
      expect(describir(5, inicio).tipo).toBe('descarga');
      expect(describir(5, inicio).semana_del_bloque).toBe(5);
      expect(describir(6, inicio).tipo).toBe('progresion');
      expect(describir(6, inicio).bloque).toBe(2);
    });

    it('permite fijar la semana actual', async () => {
      await sembrarSiVacio();
      await fijarCiclo(3);
      const estado = await estadoCiclo();
      expect(estado.semana).toBe(3);
      expect(estado.tipo).toBe('progresion');
    });
  });

  describe('Agenda semanal y calendario inteligente', () => {
    it('genera la grilla semanal y permite mover días con cascada', async () => {
      await sembrarSiVacio();
      const plan = await planActivo();
      expect(plan).not.toBeNull();

      const semana = await semanaActual(plan);
      expect(semana.dias.length).toBe(7);
      expect(semana.tiene_calendario).toBe(true);

      const hoyFecha = hoy();
      const inicio = lunes(hoyFecha);
      const diaObjetivo = sumarDias(inicio, 3); // Jueves

      // Reprogramar día 0
      const semanaModificada = await moverDiaAgenda(plan, {
        dia_orden: 0,
        fecha: diaObjetivo,
        cascada: true,
      });

      expect(semanaModificada.modificada).toBe(true);

      // Restaurar semana
      const restaurada = await restaurarSemanaAgenda(plan);
      expect(restaurada.modificada).toBe(false);
    });
  });

  describe('CRUD de Ejercicios y Progreso', () => {
    it('crea, actualiza y calcula 1RM Epley', async () => {
      const ej = await crearEjercicio({
        nombre: 'Fondos lastrados',
        grupo: 'pecho',
        tipo: 'compuesto',
        reps_min: 6,
        reps_max: 10,
        incremento_kg: 2.5,
      });

      expect(ej.id).toBeDefined();
      expect(unoRm(100, 10)).toBe(133.3);

      const actualizado = await actualizarEjercicio(ej.id, { incremento_kg: 5 });
      expect(actualizado.incremento_kg).toBe(5);

      const progreso = await progresoEjercicio(ej.id);
      expect(progreso.ejercicio.nombre).toBe('Fondos lastrados');
      expect(progreso.puntos).toEqual([]);

      await eliminarEjercicio(ej.id);
      await expect(obtenerEjercicio(ej.id)).rejects.toThrow();
    });
  });

  describe('CRUD de Sesiones y Registro', () => {
    it('guarda una sesión y actualiza el conteo semanal', async () => {
      await sembrarSiVacio();
      const plan = await planActivo();
      const ejercicios = await listarEjercicios();

      const sesion = await crearSesion({
        fecha: hoy(),
        plan_id: plan.id,
        dia_orden: 0,
        dia_nombre: 'Día A',
        series: [
          { ejercicio_id: ejercicios[0].id, peso_kg: 60, reps: 10 },
          { ejercicio_id: ejercicios[0].id, peso_kg: 60, reps: 10 },
        ],
      });

      expect(sesion.id).toBeDefined();
      expect(sesion.tipo_semana).toBeDefined();

      const conteo = await sesionesDeLaSemana();
      expect(conteo).toBe(1);

      const lista = await listarSesiones();
      expect(lista.length).toBe(1);

      await eliminarSesion(sesion.id);
      expect(await sesionesDeLaSemana()).toBe(0);
    });
  });

  describe('Mediciones', () => {
    it('registra peso y medidas corporales', async () => {
      const m = await crearMedicion({
        fecha: hoy(),
        peso_kg: 78.5,
        cintura_cm: 82,
      });

      expect(m.id).toBeDefined();
      expect(m.peso_kg).toBe(78.5);

      const lista = await listarMediciones();
      expect(lista.length).toBe(1);

      await eliminarMedicion(m.id);
      expect((await listarMediciones()).length).toBe(0);
    });
  });

  describe('Respaldo JSON', () => {
    it('exporta e importa la base completa manteniendo la integridad', async () => {
      await sembrarSiVacio();
      const planes = await listarPlanes();

      const respaldo = await exportarBase();
      expect(respaldo.version).toBe(1);
      expect(respaldo.datos.ejercicios.length).toBeGreaterThan(0);
      expect(respaldo.datos.planes.length).toBe(planes.length);

      // Limpiar y restaurar
      await limpiar('ejercicios');
      await limpiar('planes');
      expect((await listar('ejercicios')).length).toBe(0);

      await importarBase(respaldo);
      const restaurados = await listarPlanes();
      expect(restaurados.length).toBe(planes.length);
    });
  });
});
