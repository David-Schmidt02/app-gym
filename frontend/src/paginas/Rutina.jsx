import { useState } from 'react';
import Estado from '../componentes/Estado';
import Hoja from '../componentes/Hoja';
import Icono from '../componentes/Icono';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { GRUPOS, kg, nombreGrupo, parsearNumero, rangoReps } from '../lib/formato';

const PESTANAS = [
  { valor: 'rutinas', nombre: 'Rutinas' },
  { valor: 'ejercicios', nombre: 'Ejercicios' },
];

function SelectorEjercicio({ ejercicios, onElegir, etiqueta = 'Agregar ejercicio…' }) {
  return (
    <select
      value=""
      onChange={(e) => e.target.value && onElegir(Number(e.target.value))}
      aria-label={etiqueta}
      className="selector-ejercicio"
    >
      <option value="">{etiqueta}</option>
      {GRUPOS.map((g) => (
        <optgroup key={g.valor} label={g.nombre}>
          {ejercicios
            .filter((e) => e.grupo === g.valor && !e.archivado)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

/** Edita la rutina entera en memoria y la guarda de una vez (el backend reemplaza sus días). */
function EditorPlan({ plan, ejercicios, onListo }) {
  const { avisar, refrescar } = useApp();
  const porId = Object.fromEntries(ejercicios.map((e) => [e.id, e]));
  const [nombre, setNombre] = useState(plan?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(plan?.descripcion ?? '');
  const [dias, setDias] = useState(() =>
    plan
      ? plan.dias.map((d) => ({ nombre: d.nombre, ejercicios: d.ejercicios.map((e) => ({ ejercicio_id: e.ejercicio.id, series: e.series })) }))
      : [{ nombre: 'Día A', ejercicios: [] }],
  );
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const cambiarDia = (i, cambio) => setDias((previos) => previos.map((d, j) => (j === i ? { ...d, ...cambio(d) } : d)));
  const cambiarEjercicios = (i, cambio) => cambiarDia(i, (d) => ({ ejercicios: cambio(d.ejercicios) }));
  const mover = (lista, desde, hasta) => {
    if (hasta < 0 || hasta >= lista.length) return lista;
    const copia = [...lista];
    [copia[desde], copia[hasta]] = [copia[hasta], copia[desde]];
    return copia;
  };

  const guardar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const cuerpo = { nombre, descripcion: descripcion || null, dias };
      await api(plan ? `/planes/${plan.id}` : '/planes', { method: plan ? 'PUT' : 'POST', body: cuerpo });
      refrescar();
      avisar('Rutina guardada');
      onListo();
    } catch (error) {
      avisar(error.message);
      setEnviando(false);
    }
  };

  const borrar = async () => {
    try {
      await api(`/planes/${plan.id}`, { method: 'DELETE' });
      refrescar();
      avisar('Rutina borrada');
      onListo();
    } catch (error) {
      avisar(error.message);
    }
  };

  return (
    <form className="formulario" onSubmit={guardar}>
      <label className="campo">
        <span>Nombre</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={60} />
      </label>
      <label className="campo">
        <span>Descripción</span>
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={300} />
      </label>
      {dias.map((dia, i) => (
        <fieldset key={i} className="editor-dia">
          <legend className="visualmente-oculto">Día {i + 1}</legend>
          <div className="editor-dia__cabecera">
            <input value={dia.nombre} onChange={(e) => cambiarDia(i, () => ({ nombre: e.target.value }))} required maxLength={40} aria-label={`Nombre del día ${i + 1}`} />
            {dias.length > 1 && (
              <button type="button" className="boton-icono" onClick={() => setDias((d) => d.filter((_, j) => j !== i))} aria-label={`Quitar ${dia.nombre}`}>
                <Icono nombre="borrar" tamano={18} />
              </button>
            )}
          </div>
          <ol className="editor-dia__lista">
            {dia.ejercicios.map((item, j) => (
              <li key={`${item.ejercicio_id}-${j}`}>
                <span className="editor-dia__nombre">
                  {porId[item.ejercicio_id]?.nombre}
                  <span className="tenue">{nombreGrupo(porId[item.ejercicio_id]?.grupo)}</span>
                </span>
                <span className="paso" role="group" aria-label="Series">
                  <button type="button" onClick={() => cambiarEjercicios(i, (l) => l.map((x, k) => (k === j ? { ...x, series: Math.max(1, x.series - 1) } : x)))} aria-label="Una serie menos">
                    <Icono nombre="menos" tamano={16} />
                  </button>
                  <span className="cifra">{item.series}</span>
                  <button type="button" onClick={() => cambiarEjercicios(i, (l) => l.map((x, k) => (k === j ? { ...x, series: Math.min(10, x.series + 1) } : x)))} aria-label="Una serie más">
                    <Icono nombre="mas" tamano={16} />
                  </button>
                </span>
                <span className="editor-dia__acciones">
                  <button type="button" className="boton-icono" onClick={() => cambiarEjercicios(i, (l) => mover(l, j, j - 1))} disabled={j === 0} aria-label="Subir">
                    <Icono nombre="subir" tamano={16} />
                  </button>
                  <button type="button" className="boton-icono" onClick={() => cambiarEjercicios(i, (l) => mover(l, j, j + 1))} disabled={j === dia.ejercicios.length - 1} aria-label="Bajar">
                    <Icono nombre="bajar" tamano={16} />
                  </button>
                  <button type="button" className="boton-icono" onClick={() => cambiarEjercicios(i, (l) => l.filter((_, k) => k !== j))} aria-label="Quitar">
                    <Icono nombre="cerrar" tamano={16} />
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <SelectorEjercicio ejercicios={ejercicios} onElegir={(id) => cambiarEjercicios(i, (l) => [...l, { ejercicio_id: id, series: 3 }])} />
        </fieldset>
      ))}
      {dias.length < 7 && (
        <button type="button" className="boton" onClick={() => setDias((d) => [...d, { nombre: `Día ${String.fromCharCode(65 + d.length)}`, ejercicios: [] }])}>
          <Icono nombre="mas" tamano={18} />
          Agregar día
        </button>
      )}
      <button type="submit" className="boton boton--principal boton--ancho" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar rutina'}
      </button>
      {plan &&
        !plan.activo &&
        (borrando ? (
          <div className="confirmar">
            <span>¿Borrar la rutina?</span>
            <button type="button" className="boton boton--chico boton--peligro" onClick={borrar}>
              Sí, borrar
            </button>
            <button type="button" className="boton boton--chico" onClick={() => setBorrando(false)}>
              No
            </button>
          </div>
        ) : (
          <button type="button" className="boton boton--peligro boton--ancho" onClick={() => setBorrando(true)}>
            Borrar rutina
          </button>
        ))}
    </form>
  );
}

function Rutinas({ planes, ejercicios }) {
  const { avisar, refrescar } = useApp();
  const [editor, setEditor] = useState(null);

  const activar = async (plan) => {
    try {
      await api(`/planes/${plan.id}/activar`, { method: 'POST' });
      refrescar();
      avisar(`${plan.nombre} es la rutina activa`);
    } catch (error) {
      avisar(error.message);
    }
  };

  return (
    <>
      <p className="intro">El progreso se guarda por ejercicio: al cambiar de rutina, cada uno sigue desde donde quedó. Conviene cambiar al terminar una descarga.</p>
      {planes.map((plan) => (
        <section key={plan.id} className={`tarjeta${plan.activo ? ' tarjeta--destacada' : ''}`}>
          <header className="tarjeta__cabecera">
            <h2 className="tarjeta__titulo">{plan.nombre}</h2>
            {plan.activo ? (
              <span className="pastilla pastilla--progresion">Activa</span>
            ) : (
              <button type="button" className="boton boton--chico" onClick={() => activar(plan)}>
                Activar
              </button>
            )}
          </header>
          {plan.descripcion && <p className="tenue">{plan.descripcion}</p>}
          <div className="rutina-dias">
            {plan.dias.map((d) => (
              <div key={d.orden}>
                <h3 className="rutina-dias__nombre">{d.nombre}</h3>
                <ol className="lista-ejercicios">
                  {d.ejercicios.map(({ ejercicio, series }) => (
                    <li key={ejercicio.id}>
                      <span>{ejercicio.nombre}</span>
                      <span className="tenue cifra">
                        {series} × {rangoReps(ejercicio.reps_min, ejercicio.reps_max)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <button type="button" className="boton boton--chico rutina__editar" onClick={() => setEditor({ id: Date.now(), plan })}>
            <Icono nombre="editar" tamano={16} />
            Editar
          </button>
        </section>
      ))}
      <button type="button" className="boton" onClick={() => setEditor({ id: Date.now(), plan: null })}>
        <Icono nombre="mas" tamano={18} />
        Nueva rutina
      </button>
      <Hoja titulo={editor?.plan ? editor.plan.nombre : 'Nueva rutina'} abierta={Boolean(editor)} onCerrar={() => setEditor(null)}>
        {editor && <EditorPlan key={editor.id} plan={editor.plan} ejercicios={ejercicios} onListo={() => setEditor(null)} />}
      </Hoja>
    </>
  );
}

function FormEjercicio({ ejercicio, onListo }) {
  const { avisar, refrescar } = useApp();
  const [datos, setDatos] = useState(() => ({
    nombre: ejercicio?.nombre ?? '',
    grupo: ejercicio?.grupo ?? 'pecho',
    tipo: ejercicio?.tipo ?? 'compuesto',
    reps_min: String(ejercicio?.reps_min ?? 8),
    reps_max: String(ejercicio?.reps_max ?? 12),
    incremento: ejercicio ? kg(ejercicio.incremento_kg) : '2,5',
    notas: ejercicio?.notas ?? '',
  }));
  const [enviando, setEnviando] = useState(false);
  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    const incremento = parsearNumero(datos.incremento);
    if (!incremento) {
      avisar('Revisá cuántos kg subir');
      return;
    }
    const cuerpo = {
      nombre: datos.nombre,
      grupo: datos.grupo,
      tipo: datos.tipo,
      reps_min: Number(datos.reps_min),
      reps_max: Number(datos.reps_max),
      incremento_kg: incremento,
      notas: datos.notas || null,
    };
    setEnviando(true);
    try {
      await api(ejercicio ? `/ejercicios/${ejercicio.id}` : '/ejercicios', { method: ejercicio ? 'PATCH' : 'POST', body: cuerpo });
      refrescar();
      avisar('Ejercicio guardado');
      onListo();
    } catch (error) {
      avisar(error.message);
      setEnviando(false);
    }
  };

  const archivar = async () => {
    try {
      await api(`/ejercicios/${ejercicio.id}`, { method: 'PATCH', body: { archivado: !ejercicio.archivado } });
      refrescar();
      avisar(ejercicio.archivado ? 'Ejercicio restaurado' : 'Ejercicio archivado');
      onListo();
    } catch (error) {
      avisar(error.message);
    }
  };

  const borrar = async () => {
    try {
      await api(`/ejercicios/${ejercicio.id}`, { method: 'DELETE' });
      refrescar();
      avisar('Ejercicio borrado');
      onListo();
    } catch (error) {
      avisar(error.message);
    }
  };

  return (
    <form className="formulario" onSubmit={enviar}>
      <label className="campo">
        <span>Nombre</span>
        <input value={datos.nombre} onChange={cambiar('nombre')} required maxLength={80} />
      </label>
      <div className="campos-en-fila">
        <label className="campo">
          <span>Grupo muscular</span>
          <select value={datos.grupo} onChange={cambiar('grupo')}>
            {GRUPOS.map((g) => (
              <option key={g.valor} value={g.valor}>
                {g.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Tipo</span>
          <select value={datos.tipo} onChange={cambiar('tipo')}>
            <option value="compuesto">Compuesto</option>
            <option value="aislado">Aislado</option>
          </select>
        </label>
        <label className="campo">
          <span>Reps mínimas</span>
          <input type="number" min={1} max={50} value={datos.reps_min} onChange={cambiar('reps_min')} required />
        </label>
        <label className="campo">
          <span>Reps máximas</span>
          <input type="number" min={1} max={50} value={datos.reps_max} onChange={cambiar('reps_max')} required />
        </label>
      </div>
      <label className="campo">
        <span>Cuántos kg subir al completar el rango</span>
        <input inputMode="decimal" value={datos.incremento} onChange={cambiar('incremento')} required />
      </label>
      <label className="campo">
        <span>Notas (técnica, máquina, agarre…)</span>
        <input value={datos.notas} onChange={cambiar('notas')} maxLength={300} />
      </label>
      <button type="submit" className="boton boton--principal boton--ancho" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar'}
      </button>
      {ejercicio && (
        <div className="botonera">
          <button type="button" className="boton" onClick={archivar}>
            <Icono nombre={ejercicio.archivado ? 'restaurar' : 'archivar'} tamano={18} />
            {ejercicio.archivado ? 'Restaurar' : 'Archivar'}
          </button>
          <button type="button" className="boton boton--peligro" onClick={borrar}>
            <Icono nombre="borrar" tamano={18} />
            Borrar
          </button>
        </div>
      )}
    </form>
  );
}

function Ejercicios({ ejercicios }) {
  const [hoja, setHoja] = useState(null);
  const archivados = ejercicios.filter((e) => e.archivado);

  const renglon = (e) => (
    <li key={e.id}>
      <button type="button" className="renglon renglon--boton" onClick={() => setHoja({ id: Date.now(), ejercicio: e })}>
        <span className="renglon__texto">
          <span className="renglon__titulo">{e.nombre}</span>
          <span className="renglon__detalle cifra">
            {e.tipo === 'compuesto' ? 'Compuesto' : 'Aislado'} · {rangoReps(e.reps_min, e.reps_max)} reps · +{kg(e.incremento_kg)} kg
          </span>
        </span>
        <Icono nombre="editar" tamano={18} className="tenue" />
      </button>
    </li>
  );

  return (
    <>
      <p className="intro">El rango de reps decide cuándo subir: al llegar al máximo en todas las series, la próxima vez se suma el incremento.</p>
      <button type="button" className="boton" onClick={() => setHoja({ id: Date.now(), ejercicio: null })}>
        <Icono nombre="mas" tamano={18} />
        Nuevo ejercicio
      </button>
      {GRUPOS.map((g) => {
        const delGrupo = ejercicios.filter((e) => e.grupo === g.valor && !e.archivado);
        if (!delGrupo.length) return null;
        return (
          <section key={g.valor} className="tarjeta">
            <h2 className="tarjeta__titulo">
              {g.nombre} <span className="tenue">· {delGrupo.length}</span>
            </h2>
            <ul className="renglones">{delGrupo.map(renglon)}</ul>
          </section>
        );
      })}
      {archivados.length > 0 && (
        <details className="tarjeta">
          <summary className="tarjeta__titulo">Archivados · {archivados.length}</summary>
          <ul className="renglones es-archivada">{archivados.map(renglon)}</ul>
        </details>
      )}
      <Hoja titulo={hoja?.ejercicio ? hoja.ejercicio.nombre : 'Nuevo ejercicio'} abierta={Boolean(hoja)} onCerrar={() => setHoja(null)}>
        {hoja && <FormEjercicio key={hoja.id} ejercicio={hoja.ejercicio} onListo={() => setHoja(null)} />}
      </Hoja>
    </>
  );
}

export default function Rutina() {
  const [pestana, setPestana] = useState('rutinas');
  const planes = useApi('/planes');
  const ejercicios = useApi('/ejercicios');
  const listos = planes.datos && ejercicios.datos;

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Rutina</h1>
      </header>
      <div className="segmentado segmentado--pestanas" role="tablist" aria-label="Secciones de la rutina">
        {PESTANAS.map((p) => (
          <button key={p.valor} type="button" role="tab" aria-selected={pestana === p.valor} onClick={() => setPestana(p.valor)}>
            {p.nombre}
          </button>
        ))}
      </div>
      <Estado datos={listos ? true : null} error={planes.error ?? ejercicios.error} reintentar={() => (planes.reintentar(), ejercicios.reintentar())}>
        {listos && pestana === 'rutinas' && <Rutinas planes={planes.datos} ejercicios={ejercicios.datos} />}
        {listos && pestana === 'ejercicios' && <Ejercicios ejercicios={ejercicios.datos} />}
      </Estado>
    </>
  );
}
