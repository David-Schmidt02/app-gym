import { useState } from 'react';
import Estado from '../componentes/Estado';
import Hoja from '../componentes/Hoja';
import Icono from '../componentes/Icono';
import IconoMusculo from '../componentes/IconoMusculo';
import { SelectorEjercicio, SelectorOpciones } from '../componentes/Selectores';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { DIAS_POR_CANTIDAD, DIAS_SEMANA, diaSemanaCorto, GRUPOS, kg, nombreGrupo, parsearNumero, rangoReps } from '../lib/formato';

const PESTANAS = [
  { valor: 'rutinas', nombre: 'Rutinas' },
  { valor: 'ejercicios', nombre: 'Ejercicios' },
];

const TIPOS_EJERCICIO = [
  { valor: 'compuesto', nombre: 'Compuesto', detalle: '2:00' },
  { valor: 'aislado', nombre: 'Aislado', detalle: '1:15' },
];

const MODOS_AGENDA = [
  { valor: 'fija', nombre: 'Días fijos en la semana' },
  { valor: 'libre', nombre: 'Libre (uno tras otro)' },
];

const OPCIONES_DESCANSO = [
  { valor: 0, nombre: 'Sin mínimo (permitir seguidos)', detalle: '0 d' },
  { valor: 1, nombre: 'Al menos 1 día de descanso', detalle: '1 d' },
  { valor: 2, nombre: 'Al menos 2 días de descanso', detalle: '2 d' },
  { valor: 3, nombre: 'Al menos 3 días de descanso', detalle: '3 d' },
];

/** Edita la rutina entera en memoria y la guarda de una vez (el backend reemplaza sus días). */
function EditorPlan({ plan, ejercicios, onListo }) {
  const { avisar, refrescar } = useApp();
  const porId = Object.fromEntries(ejercicios.map((e) => [e.id, e]));
  const [nombre, setNombre] = useState(plan?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(plan?.descripcion ?? '');
  const [conCalendario, setConCalendario] = useState(() =>
    plan ? plan.dias.every((d) => d.dia_semana !== null && d.dia_semana !== undefined) : true,
  );
  const [descansoDias, setDescansoDias] = useState(plan?.descanso_dias ?? 1);
  const [dias, setDias] = useState(() =>
    plan
      ? plan.dias.map((d, idx) => ({
          nombre: d.nombre,
          dia_semana: d.dia_semana ?? DIAS_POR_CANTIDAD[plan.dias.length]?.[idx] ?? idx,
          ejercicios: d.ejercicios.map((e) => ({ ejercicio_id: e.ejercicio.id, series: e.series })),
        }))
      : [{ nombre: 'Día A', dia_semana: 2, ejercicios: [] }],
  );
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const cambiarDia = (i, cambio) => setDias((previos) => previos.map((d, j) => (j === i ? { ...d, ...cambio(d) } : d)));
  const cambiarEjercicios = (i, cambio) => cambiarDia(i, (d) => ({ ejercicios: cambio(d.ejercicios) }));

  const asignarDiaSemana = (indiceDia, nuevoDiaSemana) => {
    setDias((previos) => {
      const actual = previos[indiceDia].dia_semana;
      if (actual === nuevoDiaSemana) return previos;
      return previos.map((d, idx) => {
        if (idx === indiceDia) return { ...d, dia_semana: nuevoDiaSemana };
        if (d.dia_semana === nuevoDiaSemana) return { ...d, dia_semana: actual };
        return d;
      });
    });
  };

  const cambiarModoAgenda = (modo) => {
    const activar = modo === 'fija';
    setConCalendario(activar);
    if (activar) {
      setDias((previos) => {
        const sugeridos = DIAS_POR_CANTIDAD[previos.length] ?? previos.map((_, i) => i);
        const usados = new Set();
        return previos.map((d, i) => {
          const candidato = d.dia_semana !== null && d.dia_semana !== undefined && !usados.has(d.dia_semana) ? d.dia_semana : sugeridos[i];
          const final = !usados.has(candidato) ? candidato : [0, 1, 2, 3, 4, 5, 6].find((x) => !usados.has(x));
          usados.add(final);
          return { ...d, dia_semana: final };
        });
      });
    }
  };

  const agregarDia = () => {
    setDias((previos) => {
      const usados = new Set(previos.map((x) => x.dia_semana));
      const libre = [0, 1, 2, 3, 4, 5, 6].find((x) => !usados.has(x)) ?? 0;
      return [...previos, { nombre: `Día ${String.fromCharCode(65 + previos.length)}`, dia_semana: libre, ejercicios: [] }];
    });
  };

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
      const cuerpo = {
        nombre,
        descripcion: descripcion || null,
        descanso_dias: descansoDias,
        dias: dias.map((d) => ({
          nombre: d.nombre,
          dia_semana: conCalendario ? d.dia_semana : null,
          ejercicios: d.ejercicios,
        })),
      };
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
      <div className="campos-en-fila campos-en-fila--responsivo">
        <label className="campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={60} />
        </label>
        <label className="campo">
          <span>Descripción</span>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={300} />
        </label>
      </div>
      <div className="campos-en-fila campos-en-fila--responsivo">
        <SelectorOpciones
          etiqueta="Agenda semanal"
          opciones={MODOS_AGENDA}
          valor={conCalendario ? 'fija' : 'libre'}
          onCambio={cambiarModoAgenda}
        />
        {conCalendario && (
          <SelectorOpciones
            etiqueta="Descanso mínimo al postergar"
            opciones={OPCIONES_DESCANSO}
            valor={descansoDias}
            onCambio={setDescansoDias}
          />
        )}
      </div>
      <div className="editor-dias-grilla">
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
            {conCalendario && (
              <div className="selector-dias-semana" role="radiogroup" aria-label={`Día de la semana para ${dia.nombre}`}>
                {DIAS_SEMANA.map((ds) => {
                  const ocupadoPorOtro = dias.some((otro, idx) => idx !== i && otro.dia_semana === ds.valor);
                  return (
                    <button
                      key={ds.valor}
                      type="button"
                      role="radio"
                      aria-checked={dia.dia_semana === ds.valor}
                      className={`dia-semana-chip${ocupadoPorOtro ? ' es-ocupado' : ''}`}
                      title={ds.nombre}
                      onClick={() => asignarDiaSemana(i, ds.valor)}
                    >
                      {ds.corto}
                    </button>
                  );
                })}
              </div>
            )}
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
            <SelectorEjercicio
              ariaLabel={`Agregar ejercicio a ${dia.nombre}`}
              ejercicios={ejercicios}
              punteado
              textoVacio="Agregar ejercicio…"
              onElegir={(id) => cambiarEjercicios(i, (l) => [...l, { ejercicio_id: id, series: 3 }])}
            />
          </fieldset>
        ))}
      </div>
      <div className="acciones acciones--entre">
        {dias.length < 7 ? (
          <button type="button" className="boton" onClick={agregarDia}>
            <Icono nombre="mas" tamano={18} />
            Agregar día
          </button>
        ) : (
          <span />
        )}
        <div className="botonera">
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
              <button type="button" className="boton boton--peligro" onClick={() => setBorrando(true)}>
                <Icono nombre="borrar" tamano={18} />
                Borrar
              </button>
            ))}
          <button type="submit" className="boton boton--principal" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar rutina'}
          </button>
        </div>
      </div>
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
      <div className="barra-seccion">
        <p className="intro">
          El progreso se guarda por ejercicio: al cambiar de rutina, cada uno sigue desde donde quedó. Conviene cambiar al terminar una descarga.
        </p>
        <button type="button" className="boton boton--principal boton--chico" onClick={() => setEditor({ id: Date.now(), plan: null })}>
          <Icono nombre="mas" tamano={18} />
          Nueva rutina
        </button>
      </div>
      {planes.map((plan) => {
        const tieneAgenda = plan.dias.every((d) => d.dia_semana !== null && d.dia_semana !== undefined);
        const resumenAgenda = tieneAgenda
          ? `${[...plan.dias]
              .sort((a, b) => a.dia_semana - b.dia_semana)
              .map((d) => diaSemanaCorto(d.dia_semana))
              .join(' · ')} · ${plan.descanso_dias}d descanso mín.`
          : 'Sin días fijos';
        return (
          <section key={plan.id} className={`tarjeta${plan.activo ? ' tarjeta--activa' : ''}`}>
            <header className="tarjeta__cabecera">
              <div>
                <h2 className="tarjeta__titulo">{plan.nombre}</h2>
                {plan.descripcion && <p className="tenue">{plan.descripcion}</p>}
                <p className="rutina-meta tenue">
                  <Icono nombre="calendario" tamano={14} />
                  <span>{resumenAgenda}</span>
                </p>
              </div>
              <div className="botonera">
                {plan.activo ? (
                  <span className="pastilla pastilla--progresion">Activa</span>
                ) : (
                  <button type="button" className="boton boton--chico" onClick={() => activar(plan)}>
                    Activar
                  </button>
                )}
                <button type="button" className="boton boton--chico" onClick={() => setEditor({ id: Date.now(), plan })}>
                  <Icono nombre="editar" tamano={16} />
                  Editar
                </button>
              </div>
            </header>
            <div className="rutina-dias">
              {plan.dias.map((d) => (
                <div key={d.orden} className="rutina-dias__columna">
                  <h3 className="rutina-dias__nombre">
                    {d.dia_semana !== null && d.dia_semana !== undefined && (
                      <span className="pastilla-dia">{diaSemanaCorto(d.dia_semana)}</span>
                    )}
                    <span>{d.nombre}</span>
                  </h3>
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
          </section>
        );
      })}
      <Hoja titulo={editor?.plan ? editor.plan.nombre : 'Nueva rutina'} abierta={Boolean(editor)} onCerrar={() => setEditor(null)} ancha>
        {editor && <EditorPlan key={editor.id} plan={editor.plan} ejercicios={ejercicios} onListo={() => setEditor(null)} />}
      </Hoja>
    </>
  );
}

function FormEjercicio({ ejercicio, grupoInicial = 'pecho', onListo }) {
  const { avisar, refrescar } = useApp();
  const [datos, setDatos] = useState(() => ({
    nombre: ejercicio?.nombre ?? '',
    grupo: ejercicio?.grupo ?? grupoInicial,
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
        <SelectorOpciones
          etiqueta="Grupo muscular"
          opciones={GRUPOS.map((g) => ({ ...g, icono: <IconoMusculo grupo={g.valor} tamano={19} conFondo /> }))}
          valor={datos.grupo}
          onCambio={(valor) => setDatos((d) => ({ ...d, grupo: valor }))}
        />
        <SelectorOpciones
          etiqueta="Tipo"
          opciones={TIPOS_EJERCICIO}
          valor={datos.tipo}
          onCambio={(valor) => setDatos((d) => ({ ...d, tipo: valor }))}
        />
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
  const [busqueda, setBusqueda] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('');

  const termino = busqueda.trim().toLowerCase();
  const coincide = (e) => (!grupoFiltro || e.grupo === grupoFiltro) && (!termino || e.nombre.toLowerCase().includes(termino));
  const activos = ejercicios.filter((e) => !e.archivado && coincide(e));
  const archivados = ejercicios.filter((e) => e.archivado && coincide(e));

  const renglon = (e, conGrupo = false) => (
    <li key={e.id}>
      <button type="button" className="renglon renglon--boton renglon--tabla renglon--ejercicio" onClick={() => setHoja({ id: Date.now(), ejercicio: e })}>
        <span className="renglon__texto">
          <span className={`renglon__titulo${conGrupo ? ' renglon__titulo--icono' : ''}`}>
            {conGrupo && <IconoMusculo grupo={e.grupo} tamano={18} conFondo />}
            <span>{e.nombre}</span>
          </span>
          <span className="renglon__detalle cifra renglon__detalle--compacto">
            {conGrupo ? `${nombreGrupo(e.grupo)} · ` : ''}
            {e.tipo === 'compuesto' ? 'Compuesto' : 'Aislado'} · {rangoReps(e.reps_min, e.reps_max)} reps · +{kg(e.incremento_kg)} kg
          </span>
          {e.notas && <span className="renglon__detalle">{e.notas}</span>}
        </span>
        <span className="renglon__columna">{e.tipo === 'compuesto' ? 'Compuesto' : 'Aislado'}</span>
        <span className="renglon__columna renglon__columna--numero cifra">{rangoReps(e.reps_min, e.reps_max)} reps</span>
        <span className="renglon__columna renglon__columna--numero cifra">+{kg(e.incremento_kg)} kg</span>
        <Icono nombre="editar" tamano={18} className="tenue renglon__accion" />
      </button>
    </li>
  );

  return (
    <>
      <div className="barra-seccion">
        <p className="intro">El rango de reps decide cuándo subir: al llegar al máximo en todas las series, la próxima vez se suma el incremento.</p>
        <button type="button" className="boton boton--principal boton--chico" onClick={() => setHoja({ id: Date.now(), ejercicio: null })}>
          <Icono nombre="mas" tamano={18} />
          Nuevo ejercicio
        </button>
      </div>
      <div className="libreta-controles">
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
        <div className="chips chips--desplazable" role="group" aria-label="Filtrar por grupo muscular">
          <button type="button" className="chip chip--chico" aria-pressed={grupoFiltro === ''} onClick={() => setGrupoFiltro('')}>
            Todos
          </button>
          {GRUPOS.map((g) => (
            <button
              key={g.valor}
              type="button"
              className="chip chip--chico"
              aria-pressed={grupoFiltro === g.valor}
              onClick={() => setGrupoFiltro(grupoFiltro === g.valor ? '' : g.valor)}
            >
              <IconoMusculo grupo={g.valor} tamano={16} />
              {g.nombre}
            </button>
          ))}
        </div>
      </div>

      {activos.length === 0 ? (
        <div className="tarjeta vacio">
          <p>No hay ejercicios que coincidan con el filtro.</p>
          {(busqueda || grupoFiltro) && (
            <button
              type="button"
              className="boton boton--chico"
              onClick={() => {
                setBusqueda('');
                setGrupoFiltro('');
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grilla-tarjetas">
          {GRUPOS.map((g) => {
            const delGrupo = activos.filter((e) => e.grupo === g.valor);
            if (!delGrupo.length) return null;
            return (
              <section key={g.valor} className="tarjeta">
                <header className="tarjeta__cabecera">
                  <h2 className="tarjeta__titulo tarjeta__titulo--icono">
                    <IconoMusculo grupo={g.valor} tamano={21} conFondo className="insignia-musculo--mediana" />
                    <span>
                      {g.nombre} <span className="tenue">· {delGrupo.length}</span>
                    </span>
                  </h2>
                  <button
                    type="button"
                    className="boton boton--chico"
                    onClick={() => setHoja({ id: Date.now(), ejercicio: null, grupoInicial: g.valor })}
                  >
                    <Icono nombre="mas" tamano={16} /> Agregar
                  </button>
                </header>
                <ul className="renglones">
                  <li className="renglon renglon--ejercicio renglon--encabezado" aria-hidden="true">
                    <span>Ejercicio</span>
                    <span>Tipo</span>
                    <span>Rango</span>
                    <span>Subida</span>
                    <span />
                  </li>
                  {delGrupo.map((e) => renglon(e))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {archivados.length > 0 && (
        <details className="tarjeta">
          <summary className="tarjeta__titulo">Archivados · {archivados.length}</summary>
          <ul className="renglones es-archivada">{archivados.map((e) => renglon(e, true))}</ul>
        </details>
      )}
      <Hoja titulo={hoja?.ejercicio ? hoja.ejercicio.nombre : 'Nuevo ejercicio'} abierta={Boolean(hoja)} onCerrar={() => setHoja(null)}>
        {hoja && <FormEjercicio key={hoja.id} ejercicio={hoja.ejercicio} grupoInicial={hoja.grupoInicial} onListo={() => setHoja(null)} />}
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
        <div className="segmentado segmentado--pestanas" role="tablist" aria-label="Secciones de la rutina">
          {PESTANAS.map((p) => (
            <button key={p.valor} type="button" role="tab" aria-selected={pestana === p.valor} onClick={() => setPestana(p.valor)}>
              {p.nombre}
            </button>
          ))}
        </div>
      </header>
      <Estado datos={listos ? true : null} error={planes.error ?? ejercicios.error} reintentar={() => (planes.reintentar(), ejercicios.reintentar())}>
        {listos && pestana === 'rutinas' && <Rutinas planes={planes.datos} ejercicios={ejercicios.datos} />}
        {listos && pestana === 'ejercicios' && <Ejercicios ejercicios={ejercicios.datos} />}
      </Estado>
    </>
  );
}
