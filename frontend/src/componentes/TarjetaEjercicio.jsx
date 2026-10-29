import { fechaConDia, kg, nombreGrupo, parsearNumero, rangoReps, resumirSeries } from '../lib/formato';
import Carrusel from './Carrusel';
import Icono from './Icono';

const ACCIONES = {
  primera: { icono: 'mas', texto: 'Primera vez' },
  subir: { icono: 'subir', texto: 'Subí' },
  mantener: { icono: 'listo', texto: 'Mismo peso' },
  bajar: { icono: 'bajar', texto: 'Bajá' },
  descarga: { icono: 'bajar', texto: 'Descarga' },
};

function Sugerencia({ sugerencia }) {
  const accion = ACCIONES[sugerencia.accion];
  return (
    <div className={`sugerencia sugerencia--${sugerencia.accion}`}>
      <p className="sugerencia__titular">
        <Icono nombre={accion.icono} tamano={16} grosor={2.4} />
        <span>{accion.texto}</span>
        {sugerencia.peso_kg !== null && <strong className="cifra">{kg(sugerencia.peso_kg)} kg</strong>}
        <span className="tenue cifra">
          {sugerencia.series} × {rangoReps(sugerencia.reps_min, sugerencia.reps_max)}
        </span>
      </p>
      <p className="sugerencia__motivo">{sugerencia.motivo}</p>
    </div>
  );
}

/**
 * Un ejercicio del entrenamiento: lo de la vez pasada, la sugerencia y una fila por serie.
 * `filas`: [{ peso, reps, hecha }] con peso y reps como texto, igual que en el borrador guardado.
 */
export default function TarjetaEjercicio({ item, filas, onCambiar, onMarcar, onSumar, onQuitar }) {
  const { ejercicio, ultima_vez: ultima, sugerencia } = item;
  const hechas = filas.filter((f) => f.hecha).length;
  const pesoInicial = sugerencia.peso_kg ?? (ejercicio.tipo === 'compuesto' ? 20 : 5);
  // Con el mismo peso, la meta es una rep más que la vez pasada en esa serie
  const repsIniciales = (i) => {
    const antes = ultima?.series[i]?.reps;
    return sugerencia.accion === 'mantener' && antes ? Math.min(antes + 1, sugerencia.reps_max) : sugerencia.reps_min;
  };

  return (
    <section className={`tarjeta ejercicio${hechas === filas.length && filas.length ? ' es-completo' : ''}`}>
      <header className="ejercicio__cabecera">
        <h2 className="tarjeta__titulo">{ejercicio.nombre}</h2>
        <span className="tenue">
          {nombreGrupo(ejercicio.grupo)} · {hechas}/{filas.length}
        </span>
      </header>
      <p className="ejercicio__ultima">
        {ultima ? (
          <>
            <span className="tenue">La vez pasada ({fechaConDia(ultima.fecha)}):</span> <span className="cifra">{resumirSeries(ultima.series)}</span>
          </>
        ) : (
          <span className="tenue">Sin registros todavía</span>
        )}
      </p>
      <Sugerencia sugerencia={sugerencia} />
      {ejercicio.notas && <p className="ejercicio__notas">{ejercicio.notas}</p>}
      <ol className="series">
        {filas.map((fila, i) => (
          <li key={i} className={`serie-fila${fila.hecha ? ' es-hecha' : ''}`}>
            <span className="serie-fila__numero" aria-hidden="true">
              {i + 1}
            </span>
            <Carrusel
              className="serie-fila__campo"
              etiqueta={`Serie ${i + 1}: peso`}
              valor={parsearNumero(fila.peso)}
              onCambiar={(n) => onCambiar(i, { peso: kg(n) })}
              paso={0.5}
              max={500}
              inicial={pesoInicial}
              formatear={kg}
              unidad="kg"
              vacio="Peso"
              disabled={fila.hecha}
            />
            <span className="serie-fila__por" aria-hidden="true">
              ×
            </span>
            <Carrusel
              className="serie-fila__campo"
              etiqueta={`Serie ${i + 1}: repeticiones`}
              valor={fila.reps === '' ? null : Number(fila.reps)}
              onCambiar={(n) => onCambiar(i, { reps: String(n) })}
              min={1}
              max={50}
              inicial={repsIniciales(i)}
              unidad="reps"
              vacio={rangoReps(sugerencia.reps_min, sugerencia.reps_max)}
              disabled={fila.hecha}
            />
            <button
              type="button"
              className="serie-fila__marca"
              aria-pressed={fila.hecha}
              aria-label={fila.hecha ? `Desmarcar serie ${i + 1}` : `Marcar serie ${i + 1} como hecha`}
              onClick={() => onMarcar(i)}
            >
              <Icono nombre="listo" tamano={20} grosor={2.6} />
            </button>
          </li>
        ))}
      </ol>
      <div className="ejercicio__acciones">
        <button type="button" className="boton boton--chico" onClick={onSumar}>
          <Icono nombre="mas" tamano={16} />
          Serie
        </button>
        {filas.length > 0 && !filas.at(-1).hecha && (
          <button type="button" className="boton boton--chico" onClick={onQuitar}>
            <Icono nombre="menos" tamano={16} />
            Serie
          </button>
        )}
      </div>
    </section>
  );
}
