import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Carrusel from '../componentes/Carrusel';
import Estado from '../componentes/Estado';
import Icono from '../componentes/Icono';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { fechaLarga, kg, parsearNumero, SEMANAS } from '../lib/formato';

/** Series agrupadas por ejercicio, en el orden en que se hicieron. */
function agrupar(series) {
  const grupos = [];
  series.forEach((s, indice) => {
    if (grupos.at(-1)?.ejercicio_id !== s.ejercicio_id) grupos.push({ ejercicio_id: s.ejercicio_id, series: [] });
    grupos.at(-1).series.push({ ...s, indice });
  });
  return grupos;
}

function Editor({ sesion, nombres, onListo }) {
  const { avisar, refrescar } = useApp();
  const [fecha, setFecha] = useState(sesion.fecha);
  const [notas, setNotas] = useState(sesion.notas ?? '');
  const [filas, setFilas] = useState(() => sesion.series.map((s) => ({ ...s, peso: kg(s.peso_kg), repsTexto: String(s.reps) })));
  const [enviando, setEnviando] = useState(false);

  const cambiar = (i, cambio) => setFilas((previas) => previas.map((f, j) => (j === i ? { ...f, ...cambio } : f)));

  const guardar = async (e) => {
    e.preventDefault();
    const series = filas.filter((f) => !f.quitada).map((f) => ({ ejercicio_id: f.ejercicio_id, peso_kg: parsearNumero(f.peso), reps: Number(f.repsTexto) }));
    if (series.some((s) => s.peso_kg === null || !Number.isFinite(s.reps))) {
      avisar('Revisá los pesos y las reps');
      return;
    }
    if (!series.length) {
      avisar('Dejá al menos una serie, o borrá el entrenamiento');
      return;
    }
    setEnviando(true);
    try {
      await api(`/sesiones/${sesion.id}`, { method: 'PUT', body: { ...sesion, fecha, notas: notas || null, series } });
      refrescar();
      avisar('Cambios guardados');
      onListo();
    } catch (error) {
      avisar(error.message);
      setEnviando(false);
    }
  };

  return (
    <form className="tarjeta formulario" onSubmit={guardar}>
      <div className="campos-en-fila campos-en-fila--responsivo">
        <label className="campo">
          <span>Fecha</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Notas</span>
          <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={500} placeholder="Notas de la sesión…" />
        </label>
      </div>
      <div className="editor-dias-grilla">
        {agrupar(filas).map((grupo) => (
          <fieldset key={`${grupo.ejercicio_id}-${grupo.series[0].indice}`} className="editor-dia">
            <legend className="rutina-dias__nombre">{nombres[grupo.ejercicio_id]}</legend>
            <ol className="series">
              {grupo.series.map((f, n) => (
                <li key={f.indice} className={`serie-fila${f.quitada ? ' es-quitada' : ''}`}>
                  <span className="serie-fila__numero" aria-hidden="true">
                    {n + 1}
                  </span>
                  <Carrusel
                    className="serie-fila__campo"
                    etiqueta={`Serie ${n + 1}: peso`}
                    valor={parsearNumero(f.peso)}
                    onCambiar={(v) => cambiar(f.indice, { peso: kg(v) })}
                    paso={0.5}
                    max={500}
                    formatear={kg}
                    unidad="kg"
                    disabled={f.quitada}
                  />
                  <span className="serie-fila__por" aria-hidden="true">
                    ×
                  </span>
                  <Carrusel
                    className="serie-fila__campo"
                    etiqueta={`Serie ${n + 1}: repeticiones`}
                    valor={f.repsTexto === '' ? null : Number(f.repsTexto)}
                    onCambiar={(v) => cambiar(f.indice, { repsTexto: String(v) })}
                    min={1}
                    max={50}
                    unidad="reps"
                    disabled={f.quitada}
                  />
                  <button
                    type="button"
                    className="boton-icono"
                    onClick={() => cambiar(f.indice, { quitada: !f.quitada })}
                    aria-label={f.quitada ? 'Volver a incluir la serie' : 'Quitar la serie'}
                  >
                    <Icono nombre={f.quitada ? 'restaurar' : 'borrar'} tamano={18} />
                  </button>
                </li>
              ))}
            </ol>
          </fieldset>
        ))}
      </div>
      <div className="acciones">
        <button type="button" className="boton" onClick={onListo}>
          Cancelar
        </button>
        <button type="submit" className="boton boton--principal" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

/** Detalle y editor de una sesión guardada; reutilizable como página o en el panel derecho de Historial. */
export function DetalleSesion({ sesionId, nombres: nombresProp, embebido = false }) {
  const navegar = useNavigate();
  const { avisar, refrescar } = useApp();
  const { datos: sesion, error, reintentar } = useApi(sesionId ? `/sesiones/${sesionId}` : null);
  const ejercicios = useApi(nombresProp ? null : '/ejercicios');
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const nombres = nombresProp ?? Object.fromEntries((ejercicios.datos ?? []).map((e) => [e.id, e.nombre]));

  const borrar = async () => {
    try {
      await api(`/sesiones/${sesionId}`, { method: 'DELETE' });
      refrescar();
      avisar('Entrenamiento borrado');
      navegar('/historial', { replace: true });
    } catch (err) {
      avisar(err.message);
    }
  };

  if (!sesionId) {
    return (
      <div className="tarjeta vacio">
        <p>Elegí un entrenamiento de la lista para ver sus series.</p>
      </div>
    );
  }

  const grupos = sesion ? agrupar(sesion.series) : [];
  const volumen = sesion ? sesion.series.reduce((suma, s) => suma + s.peso_kg * s.reps, 0) : 0;

  return (
    <Estado datos={sesion && (nombresProp || ejercicios.datos) ? sesion : null} error={error} reintentar={reintentar}>
      {sesion && embebido && (
        <section className="tarjeta">
          <header className="tarjeta__cabecera">
            <div>
              <p className="rotulo">{fechaLarga(sesion.fecha)}</p>
              <h2 className="tarjeta__titulo tarjeta__titulo--grande">{sesion.dia_nombre}</h2>
            </div>
            <div className="botonera">
              <span className={`pastilla pastilla--${sesion.tipo_semana}`}>{SEMANAS[sesion.tipo_semana].nombre}</span>
              {!editando && (
                <button type="button" className="boton boton--chico" onClick={() => setEditando(true)}>
                  <Icono nombre="editar" tamano={16} />
                  Corregir
                </button>
              )}
              {!editando &&
                (borrando ? (
                  <>
                    <button type="button" className="boton boton--chico boton--peligro" onClick={borrar}>
                      Sí, borrar
                    </button>
                    <button type="button" className="boton boton--chico" onClick={() => setBorrando(false)}>
                      No
                    </button>
                  </>
                ) : (
                  <button type="button" className="boton boton--chico boton--peligro" onClick={() => setBorrando(true)}>
                    <Icono nombre="borrar" tamano={16} />
                    Borrar
                  </button>
                ))}
            </div>
          </header>
          <dl className="resumen-sesion__datos resumen-sesion__datos--borde">
            <div>
              <dt>Ejercicios</dt>
              <dd className="cifra">{grupos.length}</dd>
            </div>
            <div>
              <dt>Series totales</dt>
              <dd className="cifra">{sesion.series.length}</dd>
            </div>
            <div>
              <dt>Volumen movido</dt>
              <dd className="cifra">{kg(volumen)} kg</dd>
            </div>
          </dl>
        </section>
      )}
      {sesion && editando && <Editor sesion={sesion} nombres={nombres} onListo={() => setEditando(false)} />}
      {sesion && !editando && (
        <>
          <section className={`tarjeta${embebido ? ' tarjeta--llena' : ''}`}>
            <div className={`sesion-ejercicios-grilla${embebido ? ' desplazable' : ''}`}>
              {grupos.map((grupo) => (
                <div key={`${grupo.ejercicio_id}-${grupo.series[0].indice}`} className="sesion-ejercicio">
                  <span className="renglon__titulo">{nombres[grupo.ejercicio_id]}</span>
                  <span className="series-hechas">
                    {grupo.series.map((s) => (
                      <span key={s.indice} className="cifra">
                        {kg(s.peso_kg)} × {s.reps}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            {sesion.notas && <p className="ejercicio__notas">{sesion.notas}</p>}
          </section>
          {!embebido && (
            <div className="botonera">
              <button type="button" className="boton" onClick={() => setEditando(true)}>
                <Icono nombre="editar" tamano={18} />
                Corregir
              </button>
              {borrando ? (
                <>
                  <button type="button" className="boton boton--peligro" onClick={borrar}>
                    Sí, borrar
                  </button>
                  <button type="button" className="boton" onClick={() => setBorrando(false)}>
                    No
                  </button>
                </>
              ) : (
                <button type="button" className="boton boton--peligro" onClick={() => setBorrando(true)}>
                  <Icono nombre="borrar" tamano={18} />
                  Borrar
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Estado>
  );
}

export default function SesionGuardada() {
  const { id } = useParams();
  const { datos: sesion } = useApi(`/sesiones/${id}`);

  return (
    <>
      <header className="cabecera">
        <Link to="/historial" className="boton-icono" aria-label="Volver al historial">
          <Icono nombre="anterior" />
        </Link>
        <div className="cabecera__centro">
          <h1 className="cabecera__titulo">{sesion?.dia_nombre ?? 'Entrenamiento'}</h1>
          {sesion && <p className="tenue">{fechaLarga(sesion.fecha)}</p>}
        </div>
        {sesion && <span className={`pastilla pastilla--${sesion.tipo_semana}`}>{SEMANAS[sesion.tipo_semana].nombre}</span>}
      </header>
      <DetalleSesion key={id} sesionId={id} />
    </>
  );
}
