import { useState } from 'react';
import Estado from '../componentes/Estado';
import Hoja from '../componentes/Hoja';
import Icono from '../componentes/Icono';
import Lineas from '../componentes/Lineas';
import { useApp } from '../estado/contextos';
import { useApi } from '../estado/useApi';
import { api } from '../lib/api';
import { fechaConDia, fechaCorta, hoyIso, kg, parsearNumero } from '../lib/formato';

const MEDIDAS = [
  { clave: 'peso_kg', nombre: 'Peso', unidad: 'kg' },
  { clave: 'cintura_cm', nombre: 'Cintura', unidad: 'cm' },
  { clave: 'cadera_cm', nombre: 'Cadera', unidad: 'cm' },
  { clave: 'pecho_cm', nombre: 'Pecho', unidad: 'cm' },
  { clave: 'brazo_cm', nombre: 'Brazo', unidad: 'cm' },
  { clave: 'muslo_cm', nombre: 'Muslo', unidad: 'cm' },
];

const conSigno = (n) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${kg(Math.abs(n))}`;

function FormMedicion({ medicion, onListo }) {
  const { avisar, refrescar } = useApp();
  const [fecha, setFecha] = useState(medicion?.fecha ?? hoyIso());
  const [valores, setValores] = useState(() => Object.fromEntries(MEDIDAS.map((m) => [m.clave, medicion?.[m.clave] ? kg(medicion[m.clave]) : ''])));
  const [notas, setNotas] = useState(medicion?.notas ?? '');
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const cuerpo = { fecha, notas: notas || null };
    for (const m of MEDIDAS) {
      if (!valores[m.clave].trim()) continue;
      const numero = parsearNumero(valores[m.clave]);
      if (!numero) {
        avisar(`Revisá ${m.nombre.toLowerCase()}`);
        return;
      }
      cuerpo[m.clave] = numero;
    }
    setEnviando(true);
    try {
      await api(medicion ? `/mediciones/${medicion.id}` : '/mediciones', { method: medicion ? 'PUT' : 'POST', body: cuerpo });
      refrescar();
      avisar('Medición guardada');
      onListo();
    } catch (error) {
      avisar(error.message);
      setEnviando(false);
    }
  };

  const borrar = async () => {
    await api(`/mediciones/${medicion.id}`, { method: 'DELETE' }).catch((error) => avisar(error.message));
    refrescar();
    onListo();
  };

  return (
    <form className="formulario" onSubmit={enviar}>
      <label className="campo">
        <span>Fecha</span>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      </label>
      <p className="tenue">Anotá lo que hayas medido; lo demás puede quedar vacío. Conviene medirse a la mañana, en ayunas.</p>
      <div className="campos-en-fila">
        {MEDIDAS.map((m) => (
          <label key={m.clave} className="campo">
            <span>
              {m.nombre} ({m.unidad})
            </span>
            <input inputMode="decimal" value={valores[m.clave]} onChange={(e) => setValores((v) => ({ ...v, [m.clave]: e.target.value }))} />
          </label>
        ))}
      </div>
      <label className="campo">
        <span>Notas</span>
        <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={300} />
      </label>
      <button type="submit" className="boton boton--principal boton--ancho" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar'}
      </button>
      {medicion &&
        (borrando ? (
          <div className="confirmar">
            <span>¿Borrar esta medición?</span>
            <button type="button" className="boton boton--chico boton--peligro" onClick={borrar}>
              Sí, borrar
            </button>
            <button type="button" className="boton boton--chico" onClick={() => setBorrando(false)}>
              No
            </button>
          </div>
        ) : (
          <button type="button" className="boton boton--peligro boton--ancho" onClick={() => setBorrando(true)}>
            <Icono nombre="borrar" tamano={18} />
            Borrar
          </button>
        ))}
    </form>
  );
}

function ResumenMedidas({ medidas, elegida, mediciones, onElegir }) {
  if (medidas.length <= 1) return null;
  return (
    <div className="medidas-resumen" role="group" aria-label="Medida">
      {medidas.map((m) => {
        const puntos = mediciones.filter((d) => d[m.clave] !== null);
        const ultima = puntos.at(-1);
        const anterior = puntos.at(-2);
        return (
          <button
            key={m.clave}
            type="button"
            className="medida-ficha"
            aria-pressed={m.clave === elegida.clave}
            onClick={() => onElegir(m.clave)}
          >
            <span className="rotulo">{m.nombre}</span>
            <strong className="medida-ficha__valor cifra">
              {ultima ? `${kg(ultima[m.clave])} ${m.unidad}` : '—'}
            </strong>
            <span className="tenue cifra">
              {ultima && anterior ? `${conSigno(ultima[m.clave] - anterior[m.clave])} ${m.unidad}` : ultima ? fechaCorta(ultima.fecha) : 'Sin datos'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Medida({ medida, mediciones }) {
  const puntos = mediciones.filter((m) => m[medida.clave] !== null);
  if (!puntos.length) return <p className="tenue">Todavía no anotaste {medida.nombre.toLowerCase()}.</p>;
  const primera = puntos[0];
  const ultima = puntos.at(-1);
  const anterior = puntos.at(-2);

  return (
    <>
      <div className="titular">
        <span className="titular__rotulo">
          {medida.nombre} · {fechaConDia(ultima.fecha)}
        </span>
        <strong className="titular__valor">
          {kg(ultima[medida.clave])} <small>{medida.unidad}</small>
        </strong>
        {anterior && (
          <span className="tenue cifra">
            {conSigno(ultima[medida.clave] - anterior[medida.clave])} desde la anterior · {conSigno(ultima[medida.clave] - primera[medida.clave])} desde el{' '}
            {fechaCorta(primera.fecha)}
          </span>
        )}
      </div>
      {puntos.length >= 2 ? (
        <Lineas
          puntos={puntos.map((m) => ({ ...m, valor: m[medida.clave], titulo: fechaConDia(m.fecha), nota: m.notas || undefined }))}
          series={[{ clave: 'valor', nombre: medida.nombre, clase: 'serie--peso' }]}
          etiquetaX={(p) => fechaCorta(p.fecha)}
          formato={(v) => kg(v)}
          descripcion={`${medida.nombre} en ${medida.unidad} por fecha.`}
        />
      ) : (
        <p className="tenue">Con una segunda anotación aparece acá la curva de {medida.nombre.toLowerCase()}.</p>
      )}
    </>
  );
}

export default function Cuerpo() {
  const { datos, error, reintentar } = useApi('/mediciones');
  const [medida, setMedida] = useState('peso_kg');
  const [hoja, setHoja] = useState(null);

  const conDatos = MEDIDAS.filter((m) => m.clave === 'peso_kg' || datos?.some((d) => d[m.clave] !== null));
  const elegida = conDatos.find((m) => m.clave === medida) ?? MEDIDAS[0];

  return (
    <>
      <header className="cabecera">
        <h1 className="cabecera__titulo">Cuerpo</h1>
        <button type="button" className="boton boton--principal boton--chico" onClick={() => setHoja({ id: Date.now() })}>
          <Icono nombre="mas" tamano={18} />
          Anotar
        </button>
      </header>
      <Estado datos={datos} error={error} reintentar={reintentar}>
        {datos && (
          <div className="dos-columnas pantalla">
            <div className="pila">
              <ResumenMedidas medidas={conDatos} elegida={elegida} mediciones={datos} onElegir={setMedida} />
              <section className="tarjeta">
                <Medida medida={elegida} mediciones={datos} />
              </section>
            </div>
            <div className="pila">
              {datos.length > 0 ? (
                <section className="tarjeta tarjeta--llena">
                  <header className="tarjeta__cabecera">
                    <h2 className="tarjeta__titulo">Anotaciones</h2>
                    <span className="tenue">{datos.length}</span>
                  </header>
                  <ul className="renglones desplazable">
                    {[...datos].reverse().map((m) => {
                      const otras = MEDIDAS.filter((x) => x.clave !== 'peso_kg' && m[x.clave] !== null)
                        .map((x) => `${x.nombre} ${kg(m[x.clave])} ${x.unidad}`)
                        .join(' · ');
                      return (
                        <li key={m.id}>
                          <button type="button" className="renglon renglon--boton renglon--tabla renglon--medicion" onClick={() => setHoja({ id: Date.now(), medicion: m })}>
                            <span className="renglon__texto">
                              <span className="renglon__titulo">{fechaConDia(m.fecha)}</span>
                              <span className="renglon__detalle cifra renglon__detalle--compacto">
                                {MEDIDAS.filter((x) => m[x.clave] !== null)
                                  .map((x) => `${x.nombre} ${kg(m[x.clave])} ${x.unidad}`)
                                  .join(' · ')}
                              </span>
                              {m.notas && <span className="renglon__detalle">{m.notas}</span>}
                            </span>
                            <span className="renglon__columna cifra">{otras || '—'}</span>
                            <span className="renglon__columna renglon__columna--numero cifra">
                              {m.peso_kg !== null ? `${kg(m.peso_kg)} kg` : '—'}
                            </span>
                            <Icono nombre="editar" tamano={18} className="tenue renglon__accion" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : (
                <div className="tarjeta vacio">
                  <p>Registrá peso o medidas corporales para seguir la tendencia a lo largo de los bloques.</p>
                  <button type="button" className="boton boton--principal" onClick={() => setHoja({ id: Date.now() })}>
                    Cargar primera medición
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Estado>
      <Hoja titulo={hoja?.medicion ? 'Editar medición' : 'Anotar medidas'} abierta={Boolean(hoja)} onCerrar={() => setHoja(null)}>
        {hoja && <FormMedicion key={hoja.id} medicion={hoja.medicion} onListo={() => setHoja(null)} />}
      </Hoja>
    </>
  );
}
