import { useState } from 'react';
import { Link } from 'react-router-dom';
import CalendarioSemana from '../componentes/CalendarioSemana';
import Estado from '../componentes/Estado';
import Icono from '../componentes/Icono';
import TarjetaCiclo from '../componentes/TarjetaCiclo';
import { useApp, useSesion } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { diaSemanaNombre, fechaConDia, kg, nombreGrupo, rangoReps } from '../lib/formato';

function ListaDia({ dia }) {
  return (
    <ol className="lista-ejercicios lista-ejercicios--amplia desplazable">
      {dia.ejercicios.map(({ ejercicio, series }) => (
        <li key={ejercicio.id}>
          <span className="lista-ejercicios__nombre">
            <span>{ejercicio.nombre}</span>
            <span className="lista-ejercicios__grupo tenue">{nombreGrupo(ejercicio.grupo)}</span>
          </span>
          <span className="tenue cifra">
            {series} × {rangoReps(ejercicio.reps_min, ejercicio.reps_max)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function OtrosDias({ plan, excluirOrden = null, etiqueta = '¿Otro día?' }) {
  if (plan.dias.length <= 1 && excluirOrden !== null) return null;
  return (
    <nav className="otros-dias otros-dias--pie" aria-label="Entrenar otro día">
      <span className="tenue">{etiqueta}</span>
      {plan.dias.map(
        (d) =>
          d.orden !== excluirOrden && (
            <Link key={d.orden} to={`/entrenar/${d.orden}`} className="chip chip--chico">
              {d.nombre}
            </Link>
          ),
      )}
    </nav>
  );
}

function TarjetaHoy({ plan, orden, semana }) {
  const { avisar, refrescar } = useApp();
  const [enviando, setEnviando] = useState(false);

  const estadoHoy = semana?.estado_hoy ?? 'libre';
  const celdaHoy = semana?.dias.find((d) => d.es_hoy) ?? null;
  const indiceHoy = semana ? semana.dias.findIndex((d) => d.es_hoy) : -1;
  const proximoLibre =
    semana && indiceHoy >= 0 ? semana.dias.slice(indiceHoy + 1).find((d) => d.estado !== 'hecho') ?? null : null;
  const esManana = proximoLibre && indiceHoy >= 0 && proximoLibre.dia_semana === indiceHoy + 1;

  const reprogramar = async (diaOrden, fecha, mensaje) => {
    setEnviando(true);
    try {
      await api('/agenda/dia', { method: 'PUT', body: { dia_orden: diaOrden, fecha, cascada: true } });
      refrescar();
      avisar(mensaje);
    } catch (err) {
      avisar(err.message);
    }
    setEnviando(false);
  };

  if (estadoHoy === 'hecho' && celdaHoy) {
    const proximo = semana?.proximo_dia ? plan.dias[semana.proximo_dia.dia_orden] : null;
    return (
      <section className="tarjeta tarjeta--hecha tarjeta--llena" style={{ '--orden': 2 }}>
        <header className="tarjeta__cabecera">
          <div>
            <p className="rotulo es-bien">
              <Icono nombre="listo" tamano={16} grosor={2.4} />
              Hoy cumplido · {plan.nombre}
            </p>
            <h2 className="tarjeta__titulo tarjeta__titulo--grande">{celdaHoy.dia_nombre}</h2>
          </div>
          {celdaHoy.sesion_id && (
            <Link to={`/historial/${celdaHoy.sesion_id}`} className="boton boton--chico">
              Ver sesión
            </Link>
          )}
        </header>
        {proximo ? (
          <>
            <p className="tenue">
              Próximo entrenamiento: <strong>{proximo.nombre}</strong> ({fechaConDia(semana.proximo_dia.fecha)}).
            </p>
            <ListaDia dia={proximo} />
          </>
        ) : (
          <p className="tenue">¡Completaste todos los entrenamientos previstos para esta semana!</p>
        )}
        <OtrosDias plan={plan} etiqueta="¿Sesión extra?" />
      </section>
    );
  }

  if (estadoHoy === 'descanso') {
    const proximo = semana?.proximo_dia ? plan.dias[semana.proximo_dia.dia_orden] : null;
    return (
      <section className="tarjeta tarjeta--llena" style={{ '--orden': 2 }}>
        <header className="tarjeta__cabecera">
          <div>
            <p className="rotulo">
              <Icono nombre="descansoDia" tamano={15} />
              Hoy toca descanso · {plan.nombre}
            </p>
            <h2 className="tarjeta__titulo tarjeta__titulo--grande">
              {proximo ? `Próximo: ${proximo.nombre}` : 'Semana al día'}
            </h2>
            {semana?.proximo_dia && <p className="tenue">Agendado para el {fechaConDia(semana.proximo_dia.fecha)}.</p>}
          </div>
          {proximo && celdaHoy && (
            <div className="botonera">
              <button
                type="button"
                className="boton boton--chico"
                disabled={enviando}
                onClick={() => reprogramar(proximo.orden, celdaHoy.fecha, `${proximo.nombre} adelantado a hoy`)}
              >
                Traer a hoy
              </button>
              <Link to={`/entrenar/${proximo.orden}`} className="boton boton--chico">
                <Icono nombre="empezar" tamano={16} />
                Entrenar igual
              </Link>
            </div>
          )}
        </header>
        {proximo ? (
          <>
            <ListaDia dia={proximo} />
            <OtrosDias plan={plan} excluirOrden={proximo.orden} />
          </>
        ) : (
          <>
            <p className="tenue">No quedan entrenamientos pendientes esta semana. Recuperate bien para el próximo bloque.</p>
            <OtrosDias plan={plan} etiqueta="¿Entrenar igual?" />
          </>
        )}
      </section>
    );
  }

  const dia = plan.dias[orden];
  return (
    <section className="tarjeta tarjeta--destacada tarjeta--llena" style={{ '--orden': 2 }}>
      <header className="tarjeta__cabecera">
        <div>
          <p className="rotulo">
            {celdaHoy?.reprogramado ? 'Toca hoy · reprogramado' : 'Toca hoy'} · {plan.nombre}
          </p>
          <h2 className="tarjeta__titulo tarjeta__titulo--grande">{dia.nombre}</h2>
        </div>
        <div className="botonera">
          {estadoHoy === 'entrenar' && proximoLibre && (
            <button
              type="button"
              className="boton boton--chico"
              disabled={enviando}
              onClick={() =>
                reprogramar(
                  orden,
                  proximoLibre.fecha,
                  `${dia.nombre} pasado a ${esManana ? 'mañana' : diaSemanaNombre(proximoLibre.dia_semana).toLowerCase()}`,
                )
              }
            >
              <Icono nombre="postergar" tamano={16} />
              {esManana ? 'Pasar a mañana' : `Pasar al ${diaSemanaNombre(proximoLibre.dia_semana).toLowerCase()}`}
            </button>
          )}
          {estadoHoy === 'entrenar' && !proximoLibre && (
            <button
              type="button"
              className="boton boton--chico"
              disabled={enviando}
              onClick={() => reprogramar(orden, null, `${dia.nombre} pasa a la próxima semana`)}
            >
              <Icono nombre="postergar" tamano={16} />
              Dejar para el lunes
            </button>
          )}
          <Link to={`/entrenar/${orden}`} className="boton boton--principal">
            <Icono nombre="empezar" tamano={18} />
            Empezar
          </Link>
        </div>
      </header>
      <ListaDia dia={dia} />
      <OtrosDias plan={plan} excluirOrden={orden} />
    </section>
  );
}

function volumenSesion(series) {
  return series.reduce((total, s) => total + s.peso_kg * s.reps, 0);
}

function Ultimas() {
  const { datos } = useApi('/sesiones?limite=8');
  if (!datos?.length) return null;
  return (
    <section className="tarjeta tarjeta--llena" style={{ '--orden': 4 }}>
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">Últimos entrenamientos</h2>
        <Link to="/historial" className="enlace-boton">
          Ver todos
        </Link>
      </header>
      <ul className="renglones desplazable">
        {datos.map((s) => {
          const volumen = volumenSesion(s.series);
          return (
            <li key={s.id}>
              <Link to={`/historial/${s.id}`} className="renglon renglon--boton renglon--tabla renglon--sesion-corta">
                <span className="renglon__texto">
                  <span className="renglon__titulo">{s.dia_nombre}</span>
                  <span className="renglon__detalle renglon__detalle--compacto">
                    {fechaConDia(s.fecha)} · {s.series.length} series
                    {s.tipo_semana === 'descarga' && ' · descarga'}
                  </span>
                </span>
                <span className="renglon__columna">{fechaConDia(s.fecha)}</span>
                <span className="renglon__columna renglon__columna--numero">
                  {s.series.length} series{volumen > 0 ? ` · ${kg(volumen)} kg` : ''}
                  {s.tipo_semana === 'descarga' && ' · desc.'}
                </span>
                <Icono nombre="siguiente" tamano={18} className="tenue renglon__flecha" />
              </Link>
            </li>
          );
        })}
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
          <div className="tablero pantalla">
            <div className="tablero__columna">
              {datos.semana && <CalendarioSemana semana={datos.semana} style={{ '--orden': 1 }} />}
              {datos.plan && datos.dia_sugerido !== null ? (
                <TarjetaHoy plan={datos.plan} orden={datos.dia_sugerido} semana={datos.semana} />
              ) : (
                <div className="tarjeta vacio" style={{ '--orden': 2 }}>
                  <p>No hay una rutina activa.</p>
                  <Link to="/rutina" className="boton">
                    Elegir rutina
                  </Link>
                </div>
              )}
            </div>
            <div className="tablero__columna">
              <div className="tablero__celda" style={{ '--orden': 3 }}>
                <TarjetaCiclo ciclo={datos.ciclo} sesionesSemana={datos.sesiones_semana} diasPorSemana={datos.plan?.dias.length} />
              </div>
              <Ultimas />
            </div>
          </div>
        )}
      </Estado>
    </>
  );
}
