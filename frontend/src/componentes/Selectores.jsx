import { useEffect, useRef, useState } from 'react';
import { GRUPOS, nombreGrupo, rangoReps } from '../lib/formato';
import { moverEnGrilla, punteroFino } from '../lib/teclado';
import Desplegable from './Desplegable';
import Icono from './Icono';
import IconoMusculo from './IconoMusculo';

/** Botones navegables con flechas (tabindex móvil); al abrir, el foco va al elegido. */
function useFocoMovil(total, inicial, enfocarAlMontar = true) {
  const indiceSeguro = total > 0 ? Math.min(Math.max(inicial, 0), total - 1) : 0;
  const [activo, setActivo] = useState(indiceSeguro);
  const botones = useRef([]);
  const montado = useRef(false);

  useEffect(() => {
    const el = botones.current[activo];
    if (!el) return;
    if (!montado.current) {
      montado.current = true;
      el.scrollIntoView({ block: 'nearest' });
      if (enfocarAlMontar) el.focus();
      return;
    }
    el.focus();
  }, [activo, enfocarAlMontar]);

  const alTeclear = (columnas) => (e) => {
    if (!total) return;
    const nuevo = moverEnGrilla(e.key, activo, total, columnas);
    if (nuevo === null) return;
    e.preventDefault();
    setActivo(nuevo);
  };

  const enfocarPrimero = () => {
    if (!total) return;
    setActivo(0);
    botones.current[0]?.focus();
  };

  const propsDe = (i) => ({
    ref: (el) => {
      botones.current[i] = el;
    },
    tabIndex: i === activo ? 0 : -1,
  });

  return { alTeclear, propsDe, enfocarPrimero };
}

function ListaOpciones({ etiqueta, opciones, valor, onElegir }) {
  const indice = opciones.findIndex((o) => o.valor === valor);
  const { alTeclear, propsDe } = useFocoMovil(opciones.length, indice);

  return (
    <div className="lista-opciones" role="listbox" aria-label={etiqueta} onKeyDown={alTeclear(1)}>
      {opciones.map((o, i) => {
        const elegida = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="option"
            aria-selected={elegida}
            className="opcion"
            onClick={() => onElegir(o.valor)}
            {...propsDe(i)}
          >
            {o.icono}
            <span className="opcion__texto">{o.nombre}</span>
            {o.detalle && <span className="opcion__detalle tenue cifra">{o.detalle}</span>}
            {elegida && <Icono nombre="listo" tamano={18} grosor={2.4} className="opcion__marca" />}
          </button>
        );
      })}
    </div>
  );
}

/** Desplegable general de una lista plana de opciones (`[{ valor, nombre, detalle, icono }]`). */
export function SelectorOpciones({ etiqueta, ariaLabel, opciones, valor, onCambio, icono = null, disabled = false, className = '' }) {
  const elegida = opciones.find((o) => o.valor === valor);

  return (
    <Desplegable
      etiqueta={etiqueta}
      ariaLabel={ariaLabel ?? etiqueta}
      icono={icono ?? elegida?.icono ?? null}
      disabled={disabled}
      className={className}
      resumen={elegida ? elegida.nombre : <span className="tenue">Elegí una opción</span>}
    >
      {(cerrar) => (
        <ListaOpciones
          etiqueta={etiqueta ?? ariaLabel}
          opciones={opciones}
          valor={valor}
          onElegir={(nuevo) => {
            onCambio(nuevo);
            cerrar();
          }}
        />
      )}
    </Desplegable>
  );
}

function PanelEjercicios({ etiqueta, ejercicios, valor, conBuscador, onElegir }) {
  const [busqueda, setBusqueda] = useState('');
  const termino = busqueda.trim().toLowerCase();

  const gruposConItems = GRUPOS.map((g) => ({
    grupo: g,
    items: ejercicios.filter(
      (e) => e.grupo === g.valor && (!termino || e.nombre.toLowerCase().includes(termino) || g.nombre.toLowerCase().includes(termino)),
    ),
  })).filter((g) => g.items.length > 0);

  const planos = gruposConItems.flatMap((g) => g.items);
  const indiceInicial = planos.findIndex((e) => e.id === valor);
  const { alTeclear, propsDe, enfocarPrimero } = useFocoMovil(planos.length, indiceInicial, !conBuscador);

  let cursor = 0;

  return (
    <div className="panel-ejercicios">
      {conBuscador && (
        <div className="desplegable__filtro">
          <Icono nombre="buscar" tamano={16} className="buscador__icono" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && planos.length > 0) {
                e.preventDefault();
                enfocarPrimero();
              }
            }}
            placeholder="Filtrar ejercicio…"
            aria-label="Filtrar ejercicio"
            autoFocus={punteroFino()}
          />
          {busqueda && (
            <button type="button" className="boton-icono buscador__limpiar" onClick={() => setBusqueda('')} aria-label="Limpiar filtro">
              <Icono nombre="cerrar" tamano={14} />
            </button>
          )}
        </div>
      )}
      {planos.length === 0 ? (
        <p className="tenue desplegable__vacio">Sin coincidencias para «{busqueda.trim()}».</p>
      ) : (
        <div key={termino} className="lista-opciones" role="listbox" aria-label={etiqueta} onKeyDown={alTeclear(1)}>
          {gruposConItems.map(({ grupo, items }) => (
            <div key={grupo.valor} className="lista-opciones__grupo">
              <span className="lista-opciones__rotulo rotulo" aria-hidden="true">
                <IconoMusculo grupo={grupo.valor} tamano={17} />
                {grupo.nombre}
              </span>
              {items.map((e) => {
                const i = cursor++;
                const elegido = e.id === valor;
                return (
                  <button
                    key={e.id}
                    type="button"
                    role="option"
                    aria-selected={elegido}
                    className={`opcion${e.archivado ? ' es-archivada' : ''}`}
                    onClick={() => onElegir(e.id)}
                    {...propsDe(i)}
                  >
                    <span className="opcion__texto">
                      {e.nombre}
                      {e.archivado ? ' (archivado)' : ''}
                    </span>
                    <span className="opcion__detalle tenue cifra">{rangoReps(e.reps_min, e.reps_max)}</span>
                    {elegido && <Icono nombre="listo" tamano={18} grosor={2.4} className="opcion__marca" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Desplegable de ejercicios agrupados por músculo y con buscador integrado.
 * Sirve tanto para elegir un ejercicio activo (Progreso) como para sumar uno a un día (Rutina, `punteado`).
 */
export function SelectorEjercicio({
  etiqueta,
  ariaLabel = 'Elegir ejercicio',
  ejercicios,
  valor = null,
  onElegir,
  textoVacio = 'Agregar ejercicio…',
  punteado = false,
  incluirArchivados = false,
  className = '',
}) {
  const disponibles = incluirArchivados ? ejercicios : ejercicios.filter((e) => !e.archivado);
  const elegido = disponibles.find((e) => e.id === valor);

  return (
    <Desplegable
      etiqueta={etiqueta}
      ariaLabel={ariaLabel}
      punteado={punteado}
      icono={punteado ? <Icono nombre="mas" tamano={18} /> : elegido ? <IconoMusculo grupo={elegido.grupo} tamano={20} conFondo /> : null}
      className={className}
      resumen={
        elegido ? (
          <span className="desplegable__resumen-doble">
            <span>{elegido.nombre}</span>
            <span className="tenue">{nombreGrupo(elegido.grupo)}</span>
          </span>
        ) : (
          <span>{textoVacio}</span>
        )
      }
    >
      {(cerrar) => (
        <PanelEjercicios
          etiqueta={etiqueta ?? ariaLabel}
          ejercicios={disponibles}
          valor={valor}
          conBuscador={disponibles.length >= 8}
          onElegir={(id) => {
            onElegir(id);
            cerrar();
          }}
        />
      )}
    </Desplegable>
  );
}
