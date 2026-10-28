import { useState } from 'react';
import { Link } from 'react-router-dom';
import Estado from '../componentes/Estado';
import Icono from '../componentes/Icono';
import IconoMusculo from '../componentes/IconoMusculo';
import Lineas from '../componentes/Lineas';
import { SelectorEjercicio } from '../componentes/Selectores';
import { useEsEscritorio } from '../estado/useAncho';
import { useApi } from '../estado/useApi';
import { fechaConDia, fechaCorta, GRUPOS, kg, nombreGrupo, rangoReps } from '../lib/formato';

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

function SelectorLateral({ ejercicios, actual, onElegir }) {
  const [busqueda, setBusqueda] = useState('');
  const termino = busqueda.trim().toLowerCase();
  const filtrados = ejercicios.filter((e) => !termino || e.nombre.toLowerCase().includes(termino) || nombreGrupo(e.grupo).toLowerCase().includes(termino));

  return (
    <aside className="lateral pila">
      <div className="buscador">
        <Icono nombre="buscar" tamano={18} className="buscador__icono" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar ejercicio…"
          aria-label="Buscar ejercicio"
        />
        {busqueda && (
          <button type="button" className="boton-icono buscador__limpiar" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
            <Icono nombre="cerrar" tamano={16} />
          </button>
        )}
      </div>
      <section className="tarjeta tarjeta--llena selector-lateral-tarjeta">
        {filtrados.length === 0 ? (
          <p className="tenue">Ningún ejercicio coincide con «{busqueda.trim()}».</p>
        ) : (
          <div className="desplazable selector-lateral">
            {GRUPOS.map((g) => {
              const delGrupo = filtrados.filter((e) => e.grupo === g.valor);
              if (!delGrupo.length) return null;
              return (
                <div key={g.valor} className="selector-lateral__grupo">
                  <p className="rotulo">
                    <IconoMusculo grupo={g.valor} tamano={17} />
                    {g.nombre}
                  </p>
                  <ul className="selector-lateral__lista">
                    {delGrupo.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          className={`selector-lateral__item${e.archivado ? ' es-archivada' : ''}`}
                          aria-current={e.id === actual ? 'true' : undefined}
                          onClick={() => onElegir(e.id)}
                        >
                          <span className="selector-lateral__nombre">{e.nombre}</span>
                          <span className="tenue cifra">{rangoReps(e.reps_min, e.reps_max)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </aside>
  );
}

function Grafico({ ejercicioId, esEscritorio }) {
  const { datos, error, reintentar } = useApi(`/ejercicios/${ejercicioId}/progreso`);
  const ultimo = datos?.puntos.at(-1);

  return (
    <Estado datos={datos} error={error} reintentar={reintentar}>
      {datos && (
        <header className="tarjeta solo-escritorio-bloque ejercicio-ficha">
          <div className="tarjeta__cabecera">
            <div className="ejercicio-ficha__encabezado">
              <IconoMusculo grupo={datos.ejercicio.grupo} tamano={24} conFondo className="insignia-musculo--grande" />
              <div>
                <p className="rotulo">
                  {nombreGrupo(datos.ejercicio.grupo)} · {datos.ejercicio.tipo === 'compuesto' ? 'Compuesto' : 'Aislado'}
                </p>
                <h2 className="tarjeta__titulo tarjeta__titulo--grande">{datos.ejercicio.nombre}</h2>
              </div>
            </div>
            <span className="tenue cifra">
              {rangoReps(datos.ejercicio.reps_min, datos.ejercicio.reps_max)} reps · +{kg(datos.ejercicio.incremento_kg)} kg
            </span>
          </div>
        </header>
      )}
      {datos && datos.puntos.length === 0 && (
        <div className="tarjeta vacio">
          <p>Todavía no hay series de este ejercicio.</p>
        </div>
      )}
      {datos && datos.puntos.length > 0 && (
        <>
          <section className="cifras cifras--progreso">
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
            {ultimo && (
              <div className="tarjeta cifra-tarjeta">
                <span className="rotulo">Última sesión</span>
                <strong className="cifra-tarjeta__valor">
                  {kg(ultimo.peso_kg)} kg <small className="tenue">× {ultimo.reps}</small>
                </strong>
                <span className="tenue">
                  {fechaCorta(ultimo.fecha)} · {datos.puntos.length} {datos.puntos.length === 1 ? 'sesión' : 'sesiones'}
                </span>
              </div>
            )}
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
            <details className="tabla-datos" open={esEscritorio}>
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
                      <td className="cifra">{kg(p.volumen)} kg</td>
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
  const esEscritorio = useEsEscritorio();

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
          <div className="dos-columnas dos-columnas--invertida pantalla">
            <SelectorLateral ejercicios={ejercicios.datos} actual={actual} onElegir={elegir} />
            <div className="pila">
              <SelectorEjercicio
                etiqueta="Ejercicio"
                ejercicios={ejercicios.datos}
                valor={actual}
                onElegir={elegir}
                incluirArchivados
                className="solo-compacto"
              />
              {actual && <Grafico ejercicioId={actual} esEscritorio={esEscritorio} />}
            </div>
          </div>
        )}
      </Estado>
    </>
  );
}
