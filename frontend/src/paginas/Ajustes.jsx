import { useState } from 'react';
import Estado from '../componentes/Estado';
import Icono from '../componentes/Icono';
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
            <label className="campo">
              <span>Esta semana es la</span>
              <select value={datos.semana} onChange={(e) => fijar(Number(e.target.value))} disabled={enviando}>
                {Array.from({ length: Math.max(datos.semana + 11, 16) }, (_, n) => (
                  <option key={n} value={n}>
                    {nombreSemana(n)}
                  </option>
                ))}
              </select>
            </label>
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

export default function Ajustes() {
  const { usuario, salir } = useSesion();
  const [tema, setTema] = useTema();

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Ajustes</h1>
      </header>
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
    </>
  );
}
