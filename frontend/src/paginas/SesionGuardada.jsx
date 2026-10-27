import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
      await api(`/sesiones/${sesion.id}`, { method: 'PUT', body: { ...sesion, fecha, series } });
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
      <label className="campo">
        <span>Fecha</span>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      </label>
      {agrupar(filas).map((grupo) => (
        <fieldset key={`${grupo.ejercicio_id}-${grupo.series[0].indice}`} className="campo">
          <legend>{nombres[grupo.ejercicio_id]}</legend>
          <ol className="series">
            {grupo.series.map((f, n) => (
              <li key={f.indice} className={`serie-fila${f.quitada ? ' es-quitada' : ''}`}>
                <span className="serie-fila__numero" aria-hidden="true">
                  {n + 1}
                </span>
                <label className="serie-fila__campo">
                  <span className="visualmente-oculto">Peso en kg</span>
                  <input inputMode="decimal" value={f.peso} onChange={(e) => cambiar(f.indice, { peso: e.target.value })} disabled={f.quitada} />
                  <span className="serie-fila__unidad">kg</span>
                </label>
                <span className="serie-fila__por">×</span>
                <label className="serie-fila__campo">
                  <span className="visualmente-oculto">Repeticiones</span>
                  <input inputMode="numeric" value={f.repsTexto} onChange={(e) => cambiar(f.indice, { repsTexto: e.target.value.replace(/\D/g, '') })} disabled={f.quitada} />
                  <span className="serie-fila__unidad">reps</span>
                </label>
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
      <div className="botonera">
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

export default function SesionGuardada() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { avisar, refrescar } = useApp();
  const { datos: sesion, error, reintentar } = useApi(`/sesiones/${id}`);
  const ejercicios = useApi('/ejercicios');
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const nombres = Object.fromEntries((ejercicios.datos ?? []).map((e) => [e.id, e.nombre]));

  const borrar = async () => {
    try {
      await api(`/sesiones/${id}`, { method: 'DELETE' });
      refrescar();
      avisar('Entrenamiento borrado');
      navegar('/historial', { replace: true });
    } catch (err) {
      avisar(err.message);
    }
  };

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
      <Estado datos={sesion && ejercicios.datos ? sesion : null} error={error} reintentar={reintentar}>
        {sesion && editando && <Editor sesion={sesion} nombres={nombres} onListo={() => setEditando(false)} />}
        {sesion && !editando && (
          <>
            <section className="tarjeta">
              <ul className="renglones">
                {agrupar(sesion.series).map((grupo) => (
                  <li key={`${grupo.ejercicio_id}-${grupo.series[0].indice}`} className="renglon renglon--alto">
                    <span className="renglon__texto">
                      <span className="renglon__titulo">{nombres[grupo.ejercicio_id]}</span>
                      <span className="series-hechas">
                        {grupo.series.map((s) => (
                          <span key={s.indice} className="cifra">
                            {kg(s.peso_kg)} × {s.reps}
                          </span>
                        ))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {sesion.notas && <p className="ejercicio__notas">{sesion.notas}</p>}
            </section>
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
          </>
        )}
      </Estado>
    </>
  );
}
