import { Link } from 'react-router-dom';
import Estado from '../componentes/Estado';
import Icono from '../componentes/Icono';
import TarjetaCiclo from '../componentes/TarjetaCiclo';
import { useSesion } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { fechaConDia, rangoReps } from '../lib/formato';

function DiaQueToca({ plan, orden }) {
  const dia = plan.dias[orden];
  return (
    <section className="tarjeta tarjeta--destacada">
      <header className="tarjeta__cabecera">
        <div>
          <p className="rotulo">Toca hoy · {plan.nombre}</p>
          <h2 className="tarjeta__titulo tarjeta__titulo--grande">{dia.nombre}</h2>
        </div>
        <Link to={`/entrenar/${orden}`} className="boton boton--principal">
          <Icono nombre="empezar" tamano={18} />
          Empezar
        </Link>
      </header>
      <ol className="lista-ejercicios">
        {dia.ejercicios.map(({ ejercicio, series }) => (
          <li key={ejercicio.id}>
            <span>{ejercicio.nombre}</span>
            <span className="tenue cifra">
              {series} × {rangoReps(ejercicio.reps_min, ejercicio.reps_max)}
            </span>
          </li>
        ))}
      </ol>
      {plan.dias.length > 1 && (
        <nav className="otros-dias" aria-label="Entrenar otro día">
          <span className="tenue">¿Otro día?</span>
          {plan.dias.map(
            (d) =>
              d.orden !== orden && (
                <Link key={d.orden} to={`/entrenar/${d.orden}`} className="chip chip--chico">
                  {d.nombre}
                </Link>
              ),
          )}
        </nav>
      )}
    </section>
  );
}

function Ultimas() {
  const { datos } = useApi('/sesiones?limite=4');
  if (!datos?.length) return null;
  return (
    <section className="tarjeta">
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">Últimos entrenamientos</h2>
        <Link to="/historial" className="enlace-boton">
          Ver todos
        </Link>
      </header>
      <ul className="renglones">
        {datos.map((s) => (
          <li key={s.id}>
            <Link to={`/historial/${s.id}`} className="renglon renglon--boton">
              <span className="renglon__texto">
                <span className="renglon__titulo">{s.dia_nombre}</span>
                <span className="renglon__detalle">
                  {fechaConDia(s.fecha)} · {s.series.length} series
                  {s.tipo_semana === 'descarga' && ' · descarga'}
                </span>
              </span>
              <Icono nombre="siguiente" tamano={18} className="tenue" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Hoy() {
  const { usuario } = useSesion();
  const { datos, error, reintentar } = useApi('/hoy');

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Hola, {usuario.nombre}</h1>
        <Link to="/ajustes" className="boton-icono solo-celular" aria-label="Ajustes">
          <Icono nombre="ajustes" />
        </Link>
      </header>
      <Estado datos={datos} error={error} reintentar={reintentar}>
        {datos && (
          <>
            <TarjetaCiclo ciclo={datos.ciclo} sesionesSemana={datos.sesiones_semana} diasPorSemana={datos.plan?.dias.length} />
            {datos.plan && datos.dia_sugerido !== null ? (
              <DiaQueToca plan={datos.plan} orden={datos.dia_sugerido} />
            ) : (
              <div className="tarjeta vacio">
                <p>No hay una rutina activa.</p>
                <Link to="/rutina" className="boton">
                  Elegir rutina
                </Link>
              </div>
            )}
            <Ultimas />
          </>
        )}
      </Estado>
    </>
  );
}
