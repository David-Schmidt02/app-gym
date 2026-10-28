import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../estado/contextos';
import { api } from '../lib/api';
import { DIAS_SEMANA, diaSemanaCorto, diaSemanaNombre, fechaConDia, fechaCorta } from '../lib/formato';
import Icono from './Icono';

function marcaDe(celda) {
  if (celda.estado === 'hecho') return 'hecho';
  if (celda.estado === 'pendiente') return celda.reprogramado ? 'reprogramado' : 'pendiente';
  return null;
}

/** Tira semanal interactiva (Lun–Dom) inspirada en el Calendario de app-ahorro. */
export default function CalendarioSemana({ semana, style }) {
  const { avisar, refrescar } = useApp();
  const [seleccionada, setSeleccionada] = useState(null);
  const [cascada, setCascada] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const hoyFecha = semana.dias.find((d) => d.es_hoy)?.fecha ?? semana.inicio;
  const activa = semana.dias.find((d) => d.fecha === seleccionada) ?? null;

  const mover = async (diaOrden, fecha, mensaje) => {
    setEnviando(true);
    try {
      await api('/agenda/dia', { method: 'PUT', body: { dia_orden: diaOrden, fecha, cascada } });
      setSeleccionada(null);
      refrescar();
      avisar(mensaje);
    } catch (err) {
      avisar(err.message);
    }
    setEnviando(false);
  };

  const restaurar = async () => {
    setEnviando(true);
    try {
      await api('/agenda/semana', { method: 'DELETE' });
      setSeleccionada(null);
      refrescar();
      avisar('Semana restaurada a la rutina');
    } catch (err) {
      avisar(err.message);
    }
    setEnviando(false);
  };

  const moviblesAlDia = activa
    ? [
        ...semana.dias
          .filter((d) => d.estado === 'pendiente' && d.fecha !== activa.fecha)
          .map((d) => ({ dia_orden: d.dia_orden, dia_nombre: d.dia_nombre })),
        ...semana.salteados,
        ...semana.sin_lugar,
      ]
    : [];

  const destinosDesdeActiva = activa
    ? semana.dias.filter((d) => d.fecha >= hoyFecha && d.estado !== 'hecho' && d.fecha !== activa.fecha)
    : [];

  return (
    <section className="tarjeta agenda-semanal" style={style}>
      <header className="tarjeta__cabecera">
        <div>
          <h2 className="tarjeta__titulo">Esta semana</h2>
          <p className="tenue">
            {fechaCorta(semana.inicio)} – {fechaCorta(semana.fin)}
            {semana.tiene_calendario ? ` · ${semana.descanso_dias}d descanso mín.` : ' · sin días fijos'}
          </p>
        </div>
        {!semana.tiene_calendario ? (
          <Link to="/rutina" className="enlace-boton">
            Asignar días
          </Link>
        ) : (
          semana.modificada && (
            <button type="button" className="boton boton--chico" onClick={restaurar} disabled={enviando}>
              <Icono nombre="deshacer" tamano={15} />
              Restaurar
            </button>
          )
        )}
      </header>

      <div className="grilla grilla--semana" role="grid" aria-label="Días de la semana">
        {DIAS_SEMANA.map((d, i) => (
          <span key={d.valor} className={`grilla__semana${i >= 5 ? ' es-finde' : ''}`} aria-hidden="true">
            {d.corto}
          </span>
        ))}
        {semana.dias.map((celda) => {
          const marca = marcaDe(celda);
          const detalleAria =
            celda.estado === 'hecho'
              ? `completado: ${celda.dia_nombre}`
              : celda.estado === 'pendiente'
                ? `${celda.reprogramado ? 'reprogramado' : 'programado'}: ${celda.dia_nombre}`
                : 'descanso';
          return (
            <button
              key={celda.fecha}
              type="button"
              className={`grilla__dia${celda.es_hoy ? ' es-hoy' : ''}${marca ? ` es-${marca}` : ''}`}
              aria-pressed={celda.fecha === activa?.fecha}
              aria-label={`${diaSemanaNombre(celda.dia_semana)} ${Number(celda.fecha.slice(8))}, ${detalleAria}`}
              onClick={() => setSeleccionada((prev) => (prev === celda.fecha ? null : celda.fecha))}
            >
              <span className="grilla__encabezado-dia">
                <span className="grilla__numero">{Number(celda.fecha.slice(8))}</span>
                {celda.estado === 'hecho' && <Icono nombre="listo" tamano={13} grosor={2.6} className="grilla__tilde" />}
              </span>
              <span className="grilla__marcas" aria-hidden="true">
                {marca && <i className={`punto punto--${marca}`} />}
              </span>
              <span className="grilla__etiquetas" aria-hidden="true">
                {marca ? (
                  <span className={`etiqueta etiqueta--${marca}`}>{celda.dia_nombre}</span>
                ) : (
                  <span className="etiqueta-libre">Libre</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {activa && (
        <div className="agenda-panel">
          <div className="agenda-panel__cabecera">
            <div>
              <strong>
                {diaSemanaNombre(activa.dia_semana)} {Number(activa.fecha.slice(8))}
                {activa.dia_nombre ? ` · ${activa.dia_nombre}` : ''}
              </strong>
              <p className="tenue">
                {activa.estado === 'hecho' && 'Entrenamiento completado.'}
                {activa.estado === 'pendiente' &&
                  (activa.reprogramado && activa.fecha_original
                    ? `Reprogramado del ${fechaConDia(activa.fecha_original)}.`
                    : 'Entrenamiento programado.')}
                {activa.estado === 'descanso' && 'Día de descanso.'}
              </p>
            </div>
            <button type="button" className="boton-icono" onClick={() => setSeleccionada(null)} aria-label="Cerrar detalle del día">
              <Icono nombre="cerrar" tamano={16} />
            </button>
          </div>

          {activa.estado === 'hecho' && activa.sesion_id && (
            <div className="botonera">
              <Link to={`/historial/${activa.sesion_id}`} className="boton boton--chico">
                Ver sesión
              </Link>
            </div>
          )}

          {semana.tiene_calendario && activa.estado === 'pendiente' && (
            <>
              {destinosDesdeActiva.length > 0 && (
                <div className="agenda-panel__fila">
                  <span className="tenue">Mover a:</span>
                  <div className="chips">
                    {destinosDesdeActiva.map((d) => (
                      <button
                        key={d.fecha}
                        type="button"
                        className="chip chip--chico"
                        disabled={enviando}
                        onClick={() => mover(activa.dia_orden, d.fecha, `${activa.dia_nombre} movido al ${diaSemanaNombre(d.dia_semana).toLowerCase()}`)}
                      >
                        {diaSemanaCorto(d.dia_semana)} {Number(d.fecha.slice(8))}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="agenda-panel__acciones">
                <button
                  type="button"
                  className="chip chip--chico"
                  aria-pressed={cascada}
                  onClick={() => setCascada((v) => !v)}
                >
                  Reacomodar siguientes ({semana.descanso_dias}d desc.)
                </button>
                <div className="botonera">
                  <button
                    type="button"
                    className="boton boton--chico"
                    disabled={enviando}
                    onClick={() => mover(activa.dia_orden, null, `${activa.dia_nombre} salteado por esta semana`)}
                  >
                    Saltear semana
                  </button>
                  <Link to={`/entrenar/${activa.dia_orden}`} className="boton boton--principal boton--chico">
                    <Icono nombre="empezar" tamano={15} />
                    Entrenar
                  </Link>
                </div>
              </div>
            </>
          )}

          {semana.tiene_calendario && activa.estado === 'descanso' && activa.fecha >= hoyFecha && moviblesAlDia.length > 0 && (
            <div className="agenda-panel__fila">
              <span className="tenue">Agendar acá:</span>
              <div className="chips">
                {moviblesAlDia.map((item) => (
                  <button
                    key={item.dia_orden}
                    type="button"
                    className="chip chip--chico"
                    disabled={enviando}
                    onClick={() => mover(item.dia_orden, activa.fecha, `${item.dia_nombre} agendado el ${diaSemanaNombre(activa.dia_semana).toLowerCase()}`)}
                  >
                    {item.dia_nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!activa && (semana.salteados.length > 0 || semana.sin_lugar.length > 0) && (
        <p className="tenue agenda-nota">
          {semana.salteados.length > 0 && `Salteado esta semana: ${semana.salteados.map((s) => s.dia_nombre).join(', ')}. `}
          {semana.sin_lugar.length > 0 && `Pasa a la próxima semana: ${semana.sin_lugar.map((s) => s.dia_nombre).join(', ')}.`}
        </p>
      )}

      <ul className="referencias" aria-label="Referencias">
        <li>
          <i className="punto punto--hecho" /> Hecho
        </li>
        {semana.tiene_calendario && (
          <>
            <li>
              <i className="punto punto--pendiente" /> Programado
            </li>
            <li>
              <i className="punto punto--reprogramado" /> Reprogramado
            </li>
          </>
        )}
      </ul>
    </section>
  );
}
