import { Link } from 'react-router-dom';
import Estado from '../componentes/Estado';
import Icono from '../componentes/Icono';
import { useApi } from '../estado/useApi';
import { fechaConDia } from '../lib/formato';

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
  const { datos, error, reintentar } = useApi('/sesiones?limite=200');
  const ejercicios = useApi('/ejercicios');
  const nombres = Object.fromEntries((ejercicios.datos ?? []).map((e) => [e.id, e.nombre]));

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Historial</h1>
      </header>
      <Estado datos={datos} error={error} reintentar={reintentar}>
        {datos?.length === 0 && (
          <div className="tarjeta vacio">
            <p>Todavía no hay entrenamientos guardados.</p>
            <Link to="/entrenar" className="boton boton--principal">
              Empezar el primero
            </Link>
          </div>
        )}
        {datos &&
          porMes(datos).map(({ mes, sesiones }) => (
            <section key={mes} className="tarjeta">
              <h2 className="tarjeta__titulo">
                {MES.format(new Date(`${mes}-01T00:00:00Z`))} · {sesiones.length}
              </h2>
              <ul className="renglones">
                {sesiones.map((s) => {
                  const ids = [...new Set(s.series.map((serie) => serie.ejercicio_id))];
                  return (
                    <li key={s.id}>
                      <Link to={`/historial/${s.id}`} className="renglon renglon--boton">
                        <span className="renglon__texto">
                          <span className="renglon__titulo">
                            {fechaConDia(s.fecha)} · {s.dia_nombre}
                          </span>
                          <span className="renglon__detalle">
                            {s.tipo_semana === 'descarga' && 'Descarga · '}
                            {ids.map((id) => nombres[id]).filter(Boolean).join(', ')}
                          </span>
                        </span>
                        <Icono nombre="siguiente" tamano={18} className="tenue" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
      </Estado>
    </>
  );
}
