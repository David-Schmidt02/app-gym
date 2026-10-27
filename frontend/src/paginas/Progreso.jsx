import { useState } from 'react';
import { Link } from 'react-router-dom';
import Estado from '../componentes/Estado';
import Icono from '../componentes/Icono';
import Lineas from '../componentes/Lineas';
import { useApi } from '../estado/useApi';
import { fechaConDia, fechaCorta, GRUPOS, kg } from '../lib/formato';

const CLAVE = 'gym.progreso';
const SERIES = [
  { clave: 'peso_kg', nombre: 'Peso de trabajo', clase: 'serie--peso' },
  { clave: 'uno_rm', nombre: '1RM estimado', clase: 'serie--rm' },
];

function leerElegido() {
  try {
    return Number(localStorage.getItem(CLAVE)) || null;
  } catch {
    return null;
  }
}

function Grafico({ ejercicioId }) {
  const { datos, error, reintentar } = useApi(`/ejercicios/${ejercicioId}/progreso`);

  return (
    <Estado datos={datos} error={error} reintentar={reintentar}>
      {datos && datos.puntos.length === 0 && (
        <div className="tarjeta vacio">
          <p>Todavía no hay series de este ejercicio.</p>
        </div>
      )}
      {datos && datos.puntos.length > 0 && (
        <>
          <section className="cifras">
            <div className="tarjeta cifra-tarjeta">
              <span className="rotulo">
                <Icono nombre="record" tamano={16} /> Récord de peso
              </span>
              <strong className="cifra-tarjeta__valor">{kg(datos.record_peso?.peso_kg)} kg</strong>
              {datos.record_peso && (
                <span className="tenue">
                  × {datos.record_peso.reps} · {fechaCorta(datos.record_peso.fecha)}
                </span>
              )}
            </div>
            <div className="tarjeta cifra-tarjeta">
              <span className="rotulo">1RM estimado</span>
              <strong className="cifra-tarjeta__valor">{kg(datos.record_uno_rm?.uno_rm)} kg</strong>
              <span className="tenue">lo que podrías levantar una vez</span>
            </div>
          </section>
          <section className="tarjeta">
            <header className="tarjeta__cabecera">
              <h2 className="tarjeta__titulo">Cómo viene</h2>
              <span className="tenue">{datos.puntos.length} sesiones</span>
            </header>
            <ul className="leyenda-series" aria-hidden="true">
              {SERIES.map((s) => (
                <li key={s.clave}>
                  <span className={`clave-linea ${s.clase}`} />
                  {s.nombre}
                </li>
              ))}
              {datos.puntos.some((p) => p.descarga) && (
                <li>
                  <span className="clave-hueco" /> descarga
                </li>
              )}
            </ul>
            {datos.puntos.length < 2 ? (
              <p className="tenue">Con dos entrenamientos aparece acá la curva.</p>
            ) : (
              <Lineas
                puntos={datos.puntos.map((p) => ({
                  ...p,
                  hueco: p.descarga,
                  titulo: fechaConDia(p.fecha),
                  nota: `${kg(p.peso_kg)} kg × ${p.reps}${p.descarga ? ' · descarga' : ''}`,
                }))}
                series={SERIES}
                etiquetaX={(p) => fechaCorta(p.fecha)}
                formato={(v) => kg(v)}
                descripcion={`Peso de trabajo y 1RM estimado de ${datos.ejercicio.nombre} por sesión, en kg.`}
              />
            )}
            <details className="tabla-datos">
              <summary>Ver como tabla</summary>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Peso × reps</th>
                    <th scope="col">1RM est.</th>
                    <th scope="col">Volumen</th>
                  </tr>
                </thead>
                <tbody>
                  {[...datos.puntos].reverse().map((p) => (
                    <tr key={`${p.fecha}-${p.volumen}`}>
                      <th scope="row">
                        {fechaConDia(p.fecha)}
                        {p.descarga && ' (desc.)'}
                      </th>
                      <td className="cifra">
                        {kg(p.peso_kg)} × {p.reps}
                      </td>
                      <td className="cifra">{kg(p.uno_rm)}</td>
                      <td className="cifra">{kg(p.volumen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>
        </>
      )}
    </Estado>
  );
}

export default function Progreso() {
  const ejercicios = useApi('/ejercicios');
  const ultima = useApi('/sesiones?limite=1');
  const [elegido, setElegido] = useState(leerElegido);

  const porDefecto = ultima.datos?.[0]?.series[0]?.ejercicio_id ?? ejercicios.datos?.[0]?.id;
  const actual = ejercicios.datos?.some((e) => e.id === elegido) ? elegido : porDefecto;

  const elegir = (id) => {
    setElegido(id);
    try {
      localStorage.setItem(CLAVE, String(id));
    } catch {
      // Sin storage se elige de nuevo la próxima vez
    }
  };

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Progreso</h1>
        <Link to="/historial" className="boton boton--chico">
          <Icono nombre="historial" tamano={16} />
          Historial
        </Link>
      </header>
      <Estado datos={ejercicios.datos} error={ejercicios.error} reintentar={ejercicios.reintentar}>
        {ejercicios.datos && (
          <>
            <label className="campo">
              <span>Ejercicio</span>
              <select value={actual ?? ''} onChange={(e) => elegir(Number(e.target.value))}>
                {GRUPOS.map((g) => (
                  <optgroup key={g.valor} label={g.nombre}>
                    {ejercicios.datos
                      .filter((e) => e.grupo === g.valor)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                          {e.archivado ? ' (archivado)' : ''}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            {actual && <Grafico ejercicioId={actual} />}
          </>
        )}
      </Estado>
    </>
  );
}
