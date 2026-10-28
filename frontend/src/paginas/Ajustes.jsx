import { useState } from 'react';
import Estado from '../componentes/Estado';
import Icono from '../componentes/Icono';
import { SelectorOpciones } from '../componentes/Selectores';
import { useApp, useSesion } from '../estado/contextos';
import { TEMAS, useTema } from '../estado/tema';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { SEMANAS } from '../lib/formato';

function nombreSemana(n) {
  if (n === 0) return 'Semana 0 · adaptación';
  const bloque = Math.floor((n - 1) / 5) + 1;
  const delBloque = ((n - 1) % 5) + 1;
  return `Semana ${n} · bloque ${bloque}, ${delBloque === 5 ? 'descarga' : `${delBloque}.ª de progresión`}`;
}

function Ciclo() {
  const { avisar, refrescar } = useApp();
  const { datos, error, reintentar } = useApi('/ciclo');
  const [enviando, setEnviando] = useState(false);

  const fijar = async (semana) => {
    setEnviando(true);
    try {
      await api('/ciclo', { method: 'PUT', body: { semana } });
      refrescar();
      avisar('Ciclo actualizado');
    } catch (err) {
      avisar(err.message);
    }
    setEnviando(false);
  };

  return (
    <section className="tarjeta">
      <h2 className="tarjeta__titulo">Ciclo de entrenamiento</h2>
      <p className="tenue">
        Arranca con una semana de adaptación y sigue en bloques de 5 semanas: 4 de progresión y 1 de descarga. Cada lunes avanza una semana.
      </p>
      <Estado datos={datos} error={error} reintentar={reintentar}>
        {datos && (
          <>
            <SelectorOpciones
              etiqueta="Esta semana es la"
              opciones={Array.from({ length: Math.max(datos.semana + 11, 16) }, (_, n) => ({
                valor: n,
                nombre: nombreSemana(n),
              }))}
              valor={datos.semana}
              onCambio={fijar}
              disabled={enviando}
            />
            <p className="tenue">{SEMANAS[datos.tipo].detalle}</p>
            <div className="botonera">
              <button type="button" className="boton boton--chico" onClick={() => fijar(1)} disabled={enviando}>
                Empezar bloque nuevo
              </button>
              <button type="button" className="boton boton--chico" onClick={() => fijar(0)} disabled={enviando}>
                Volver a adaptación
              </button>
            </div>
          </>
        )}
      </Estado>
    </section>
  );
}

function GuiaProgresion() {
  return (
    <section className="tarjeta">
      <h2 className="tarjeta__titulo">Cómo decide el peso sugerido</h2>
      <ul className="renglones guia-lista">
        <li className="renglon renglon--alto">
          <span className="renglon__texto">
            <span className="renglon__titulo">Doble progresión</span>
            <span className="renglon__detalle">
              Mantenés el peso hasta alcanzar el tope de reps en todas las series; recién ahí subís el incremento del ejercicio y volvés al piso del rango.
            </span>
          </span>
        </li>
        <li className="renglon renglon--alto">
          <span className="renglon__texto">
            <span className="renglon__titulo">Estancamiento</span>
            <span className="renglon__detalle">
              Si dos sesiones seguidas con el mismo peso suman menos repeticiones totales, sugiere bajar un 10 % para retomar impulso.
            </span>
          </span>
        </li>
        <li className="renglon renglon--alto">
          <span className="renglon__texto">
            <span className="renglon__titulo">Semana de descarga</span>
            <span className="renglon__detalle">
              La 5.ª semana de cada bloque reduce las series a la mitad y el peso un 15 %. Esas sesiones no alteran la progresión del siguiente bloque.
            </span>
          </span>
        </li>
      </ul>
    </section>
  );
}

export default function Ajustes() {
  const { usuario, salir } = useSesion();
  const [tema, setTema] = useTema();

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Ajustes</h1>
      </header>
      <div className="dos-columnas dos-columnas--parejas">
        <div className="pila">
          <Ciclo />
          <section className="tarjeta solo-celular">
            <h2 className="tarjeta__titulo">Tema</h2>
            <div className="segmentado" role="group" aria-label="Tema">
              {TEMAS.map((t) => (
                <button key={t.valor} type="button" aria-pressed={tema === t.valor} onClick={() => setTema(t.valor)}>
                  <Icono nombre={t.icono} tamano={18} />
                  {t.nombre}
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="pila">
          <GuiaProgresion />
          <section className="tarjeta solo-celular">
            <h2 className="tarjeta__titulo">Cuenta</h2>
            <p>
              <strong>{usuario.nombre}</strong> <span className="tenue">· {usuario.email}</span>
            </p>
            <button type="button" className="boton" onClick={salir}>
              <Icono nombre="salir" tamano={18} />
              Cerrar sesión
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
