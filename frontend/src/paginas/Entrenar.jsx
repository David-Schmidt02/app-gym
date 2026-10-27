import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import Descanso from '../componentes/Descanso';
import Estado from '../componentes/Estado';
import TarjetaEjercicio from '../componentes/TarjetaEjercicio';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { hoyIso, kg, parsearNumero, SEMANAS } from '../lib/formato';

const CLAVE_BORRADORES = 'gym.borradores';
const DESCANSO_SEGUNDOS = { compuesto: 120, aislado: 75 };

/** Instante (ms) en que termina un descanso que empieza ahora. */
const finDeDescanso = (segundos) => Date.now() + segundos * 1000;

/**
 * Los entrenamientos en curso viven en el teléfono hasta terminarlos, uno por día de la rutina:
 * si se cierra la app o se mira otro día, cada uno sigue donde estaba. Los de otra fecha se descartan.
 */
const borradores = {
  todos: () => {
    try {
      const guardados = JSON.parse(localStorage.getItem(CLAVE_BORRADORES)) ?? {};
      return Object.fromEntries(Object.entries(guardados).filter(([, b]) => b.fecha === hoyIso()));
    } catch {
      return {};
    }
  },
  leer: (clave) => borradores.todos()[clave] ?? null,
  guardar: (clave, valor) => {
    const todos = borradores.todos();
    if (valor) todos[clave] = valor;
    else delete todos[clave];
    try {
      localStorage.setItem(CLAVE_BORRADORES, JSON.stringify(todos));
    } catch {
      // Sin storage el borrador dura lo que la pantalla
    }
  },
};

function filasIniciales(item) {
  const peso = item.sugerencia.peso_kg ?? item.ultima_vez?.series.at(-1)?.peso_kg;
  return Array.from({ length: item.sugerencia.series }, () => ({ peso: peso === undefined || peso === null ? '' : kg(peso), reps: '', hecha: false }));
}

function borradorNuevo(datos) {
  return {
    fecha: hoyIso(),
    notas: '',
    filas: Object.fromEntries(datos.ejercicios.map((item) => [item.ejercicio.id, filasIniciales(item)])),
  };
}

function Sesion({ datos, plan }) {
  const { avisar, refrescar } = useApp();
  const navegar = useNavigate();
  const clave = `${datos.plan_id}:${datos.dia_orden}`;
  const [estado, setEstado] = useState(() => borradores.leer(clave) ?? borradorNuevo(datos));
  const [descanso, setDescanso] = useState(null);
  const [descartando, setDescartando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => borradores.guardar(clave, estado), [clave, estado]);

  const cambiarFilas = useCallback((ejercicioId, cambio) => {
    setEstado((previo) => ({ ...previo, filas: { ...previo.filas, [ejercicioId]: cambio(previo.filas[ejercicioId] ?? []) } }));
  }, []);

  const marcar = (item, i) => {
    const fila = estado.filas[item.ejercicio.id][i];
    if (!fila.hecha && (parsearNumero(fila.peso) === null || fila.reps === '')) {
      avisar('Anotá el peso y las reps de la serie');
      return;
    }
    cambiarFilas(item.ejercicio.id, (filas) => filas.map((f, j) => (j === i ? { ...f, hecha: !f.hecha } : f)));
    if (!fila.hecha) {
      const total = DESCANSO_SEGUNDOS[item.ejercicio.tipo];
      setDescanso({ hasta: finDeDescanso(total), total });
    }
  };

  const terminar = async () => {
    const series = datos.ejercicios.flatMap((item) =>
      (estado.filas[item.ejercicio.id] ?? [])
        .filter((f) => f.hecha)
        .map((f) => ({ ejercicio_id: item.ejercicio.id, peso_kg: parsearNumero(f.peso), reps: Number(f.reps) })),
    );
    if (!series.length) {
      avisar('Marcá al menos una serie hecha');
      return;
    }
    setEnviando(true);
    try {
      const sesion = await api('/sesiones', {
        method: 'POST',
        body: {
          fecha: estado.fecha,
          plan_id: datos.plan_id,
          dia_orden: datos.dia_orden,
          dia_nombre: datos.dia_nombre,
          notas: estado.notas || null,
          series,
        },
      });
      borradores.guardar(clave, null);
      refrescar();
      avisar('¡Entrenamiento guardado!');
      navegar(`/historial/${sesion.id}`, { replace: true });
    } catch (error) {
      avisar(error.message);
      setEnviando(false);
    }
  };

  const descartar = () => {
    setEstado(borradorNuevo(datos));
    setDescartando(false);
    setDescanso(null);
  };

  const hechas = Object.values(estado.filas).flat().filter((f) => f.hecha).length;
  const semana = SEMANAS[datos.tipo_semana];

  return (
    <>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{datos.dia_nombre}</h1>
          <p className="tenue">{plan?.nombre}</p>
        </div>
        <span className={`pastilla pastilla--${datos.tipo_semana}`}>{semana.nombre}</span>
      </header>
      {plan && plan.dias.length > 1 && (
        <nav className="otros-dias" aria-label="Cambiar de día">
          {plan.dias.map((d) => (
            <Link key={d.orden} to={`/entrenar/${d.orden}`} className="chip chip--chico" aria-current={d.orden === datos.dia_orden ? 'page' : undefined}>
              {d.nombre}
            </Link>
          ))}
        </nav>
      )}
      {datos.tipo_semana !== 'progresion' && <p className="intro">{semana.detalle}</p>}

      {datos.ejercicios.map((item) => {
        const id = item.ejercicio.id;
        return (
          <TarjetaEjercicio
            key={id}
            item={item}
            filas={estado.filas[id] ?? []}
            onCambiar={(i, cambio) => cambiarFilas(id, (filas) => filas.map((f, j) => (j === i ? { ...f, ...cambio } : f)))}
            onMarcar={(i) => marcar(item, i)}
            onSumar={() => cambiarFilas(id, (filas) => [...filas, { peso: filas.at(-1)?.peso ?? '', reps: '', hecha: false }])}
            onQuitar={() => cambiarFilas(id, (filas) => filas.slice(0, -1))}
          />
        );
      })}

      <section className="tarjeta">
        <label className="campo">
          <span>Notas del día</span>
          <input value={estado.notas} onChange={(e) => setEstado((p) => ({ ...p, notas: e.target.value }))} maxLength={500} placeholder="Cómo te sentiste, molestias…" />
        </label>
        <button type="button" className="boton boton--principal boton--ancho" onClick={terminar} disabled={enviando}>
          {enviando ? 'Guardando…' : `Terminar entrenamiento (${hechas} series)`}
        </button>
        {descartando ? (
          <div className="confirmar">
            <span>¿Descartar lo anotado?</span>
            <button type="button" className="boton boton--chico boton--peligro" onClick={descartar}>
              Sí, descartar
            </button>
            <button type="button" className="boton boton--chico" onClick={() => setDescartando(false)}>
              No
            </button>
          </div>
        ) : (
          <button type="button" className="enlace-boton enlace-boton--tenue" onClick={() => setDescartando(true)}>
            Descartar y empezar de nuevo
          </button>
        )}
      </section>

      {descanso && (
        <Descanso
          key={descanso.hasta - descanso.total * 1000}
          hasta={descanso.hasta}
          total={descanso.total}
          onSumar={() => setDescanso((d) => ({ hasta: Math.max(d.hasta, Date.now()) + 15_000, total: d.total + 15 }))}
          onCerrar={() => setDescanso(null)}
        />
      )}
    </>
  );
}

export default function Entrenar() {
  const { dia } = useParams();
  const hoy = useApi('/hoy');
  const entrenamiento = useApi(dia === undefined ? null : `/entrenar/${dia}`);

  if (dia === undefined) {
    if (hoy.datos?.dia_sugerido !== null && hoy.datos?.dia_sugerido !== undefined) {
      return <Navigate to={`/entrenar/${hoy.datos.dia_sugerido}`} replace />;
    }
    if (hoy.datos) return <Navigate to="/rutina" replace />;
    return <Estado datos={null} error={hoy.error} reintentar={hoy.reintentar} />;
  }

  return (
    <Estado datos={entrenamiento.datos} error={entrenamiento.error} reintentar={entrenamiento.reintentar}>
      {entrenamiento.datos && <Sesion key={dia} datos={entrenamiento.datos} plan={hoy.datos?.plan} />}
    </Estado>
  );
}
