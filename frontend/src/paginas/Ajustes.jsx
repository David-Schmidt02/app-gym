import { useRef, useState } from 'react';
import Estado from '../componentes/Estado';
import Icono from '../componentes/Icono';
import { SelectorOpciones } from '../componentes/Selectores';
import { useApp, useSesion } from '../estado/contextos';
import { TEMAS, useTema } from '../estado/tema';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { exportarRespaldo, restaurarRespaldo } from '../lib/backup';
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

function RespaldoYPerfil() {
  const { usuario, actualizarNombre } = useSesion();
  const { avisar, refrescar } = useApp();
  const [nombre, setNombre] = useState(usuario?.nombre || 'David');
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const archivoInputRef = useRef(null);

  const guardarPerfil = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardandoNombre(true);
    try {
      await actualizarNombre(nombre.trim());
      avisar('Nombre actualizado');
    } catch (err) {
      avisar(err.message);
    }
    setGuardandoNombre(false);
  };

  const handleExportar = async () => {
    setTrabajando(true);
    try {
      await exportarRespaldo();
      avisar('Respaldo guardado correctamente');
    } catch (err) {
      avisar('Error al exportar: ' + err.message);
    }
    setTrabajando(false);
  };

  const handleImportar = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!window.confirm('¿Restaurar este respaldo? Reemplazará todos los entrenamientos y medidas actuales por los del archivo.')) {
      e.target.value = '';
      return;
    }
    setTrabajando(true);
    try {
      await restaurarRespaldo(archivo);
      refrescar();
      avisar('Respaldo restaurado con éxito');
    } catch (err) {
      avisar('Error al importar: ' + err.message);
    }
    e.target.value = '';
    setTrabajando(false);
  };

  return (
    <section className="tarjeta">
      <h2 className="tarjeta__titulo">Respaldo y libreta local</h2>
      <p className="tenue">
        Tus rutinas, entrenamientos y medidas se guardan de forma 100 % autónoma en este dispositivo. Podés exportar o restaurar una copia en cualquier momento.
      </p>

      <form onSubmit={guardarPerfil} className="campo" style={{ marginTop: 'var(--espacio-2)' }}>
        <span>Tu nombre</span>
        <div style={{ display: 'flex', gap: 'var(--espacio-2)' }}>
          <input
            id="nombre-usuario"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={guardandoNombre}
          />
          <button type="submit" className="boton boton--chico" disabled={guardandoNombre || nombre === usuario?.nombre}>
            Guardar
          </button>
        </div>
      </form>

      <div className="botonera" style={{ marginTop: 'var(--espacio-3)' }}>
        <button type="button" className="boton boton--primario" onClick={handleExportar} disabled={trabajando}>
          <Icono nombre="descargar" tamano={18} />
          Exportar respaldo JSON
        </button>

        <button type="button" className="boton" onClick={() => archivoInputRef.current?.click()} disabled={trabajando}>
          <Icono nombre="restaurarBackup" tamano={18} />
          Restaurar respaldo JSON
        </button>
        <input
          ref={archivoInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportar}
          style={{ display: 'none' }}
        />
      </div>
    </section>
  );
}

export default function Ajustes() {
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
            <header className="tarjeta__cabecera">
              <h2 className="tarjeta__titulo">Tema</h2>
              <span className="tenue">{TEMAS.find((t) => t.valor === tema)?.nombre}</span>
            </header>
            <div className="segmentado segmentado--tema" role="group" aria-label="Tema">
              {TEMAS.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  aria-pressed={tema === t.valor}
                  onClick={() => setTema(t.valor)}
                  aria-label={`Tema ${t.nombre}`}
                  title={t.nombre}
                >
                  <Icono nombre={t.icono} tamano={20} />
                  <span className="segmentado__etiqueta">{t.nombre}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="pila">
          <RespaldoYPerfil />
          <GuiaProgresion />
        </div>
      </div>
    </>
  );
}
