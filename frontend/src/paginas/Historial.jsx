import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Estado from '../componentes/Estado';
import Icono from '../componentes/Icono';
import { useEsEscritorio } from '../estado/useAncho';
import { useApi } from '../estado/useApi';
import { fechaConDia } from '../lib/formato';
import SesionGuardada, { DetalleSesion } from './SesionGuardada';

const MES = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Agrupa las sesiones (ya ordenadas de la más nueva a la más vieja) por mes. */
function porMes(sesiones) {
  const meses = [];
  for (const s of sesiones) {
    const mes = s.fecha.slice(0, 7);
    if (meses.at(-1)?.mes !== mes) meses.push({ mes, sesiones: [] });
    meses.at(-1).sesiones.push(s);
  }
  return meses;
}

export default function Historial() {
  const { id } = useParams();
  const esEscritorio = useEsEscritorio();
  const [busqueda, setBusqueda] = useState('');
  const { datos, error, reintentar } = useApi(!esEscritorio && id ? null : '/sesiones?limite=200');
  const ejercicios = useApi(!esEscritorio && id ? null : '/ejercicios');

  if (!esEscritorio && id) {
    return <SesionGuardada />;
  }

  const nombres = Object.fromEntries((ejercicios.datos ?? []).map((e) => [e.id, e.nombre]));
  const termino = busqueda.trim().toLowerCase();
  const visibles = (datos ?? []).filter((s) => {
    if (!termino) return true;
    const textoEjercicios = [...new Set(s.series.map((x) => nombres[x.ejercicio_id]))]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return s.dia_nombre.toLowerCase().includes(termino) || fechaConDia(s.fecha).toLowerCase().includes(termino) || textoEjercicios.includes(termino);
  });

  const idElegido = id && datos?.some((s) => String(s.id) === id) ? Number(id) : visibles[0]?.id ?? datos?.[0]?.id ?? null;

  const lista = (
    <>
      {(datos?.length ?? 0) > 0 && (
        <div className="buscador">
          <Icono nombre="buscar" tamano={18} className="buscador__icono" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar día o ejercicio…"
            aria-label="Buscar entrenamiento"
          />
          {busqueda && (
            <button type="button" className="boton-icono buscador__limpiar" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
              <Icono nombre="cerrar" tamano={16} />
            </button>
          )}
        </div>
      )}
      {datos && visibles.length === 0 && datos.length > 0 && (
        <div className="tarjeta vacio">
          <p>Ningún entrenamiento coincide con «{busqueda.trim()}».</p>
          <button type="button" className="boton boton--chico" onClick={() => setBusqueda('')}>
            Limpiar búsqueda
          </button>
        </div>
      )}
      {datos &&
        porMes(visibles).map(({ mes, sesiones }) => (
          <section key={mes} className="tarjeta">
            <h2 className="tarjeta__titulo">
              {MES.format(new Date(`${mes}-01T00:00:00Z`))} <span className="tenue">· {sesiones.length}</span>
            </h2>
            <ul className="renglones">
              {sesiones.map((s) => {
                const ids = [...new Set(s.series.map((serie) => serie.ejercicio_id))];
                const activa = esEscritorio && s.id === idElegido;
                return (
                  <li key={s.id}>
                    <Link
                      to={`/historial/${s.id}`}
                      className={`renglon renglon--boton${activa ? ' es-seleccionado' : ''}`}
                      aria-current={activa ? 'page' : undefined}
                    >
                      <span className="renglon__texto">
                        <span className="renglon__titulo">
                          {fechaConDia(s.fecha)} · {s.dia_nombre}
                        </span>
                        <span className="renglon__detalle">
                          {s.tipo_semana === 'descarga' && 'Descarga · '}
                          {ids.map((ejId) => nombres[ejId]).filter(Boolean).join(', ')}
                        </span>
                      </span>
                      <span className="tenue cifra">{s.series.length}s</span>
                      <Icono nombre="siguiente" tamano={18} className="tenue" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </>
  );

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Historial</h1>
        <Link to="/progreso" className="boton boton--chico">
          <Icono nombre="progreso" tamano={16} />
          Curvas
        </Link>
      </header>
      <Estado datos={datos} error={error} reintentar={reintentar}>
        {datos?.length === 0 ? (
          <div className="tarjeta vacio">
            <p>Todavía no hay entrenamientos guardados.</p>
            <Link to="/entrenar" className="boton boton--principal">
              Empezar el primero
            </Link>
          </div>
        ) : esEscritorio ? (
          <div className="dos-columnas dos-columnas--invertida pantalla">
            <div className="pila">{lista}</div>
            <div className="pila">
              <DetalleSesion key={idElegido} sesionId={idElegido} nombres={nombres} embebido />
            </div>
          </div>
        ) : (
          lista
        )}
      </Estado>
    </>
  );
}
