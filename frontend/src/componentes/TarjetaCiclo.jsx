import { fechaConDia, SEMANAS } from '../lib/formato';

const BLOQUE = [1, 2, 3, 4, 5];

/** La semana del ciclo: dónde estás en el bloque de 4 + 1 y qué significa. */
export default function TarjetaCiclo({ ciclo, sesionesSemana, diasPorSemana }) {
  const semana = SEMANAS[ciclo.tipo];
  const titulo = ciclo.tipo === 'adaptacion' ? 'Semana de adaptación' : `Semana ${ciclo.semana_del_bloque} de 5 · ${semana.nombre}`;

  return (
    <section className={`tarjeta ciclo ciclo--${ciclo.tipo}`}>
      <header className="tarjeta__cabecera">
        <h2 className="tarjeta__titulo">{titulo}</h2>
        {ciclo.bloque > 0 && <span className="tenue">Bloque {ciclo.bloque}</span>}
      </header>
      <ol className="ciclo__tira" aria-label="Semanas del bloque">
        {BLOQUE.map((n) => (
          <li
            key={n}
            className={`${n === 5 ? 'es-descarga' : ''} ${n === ciclo.semana_del_bloque ? 'es-actual' : ''} ${n < ciclo.semana_del_bloque ? 'es-pasada' : ''}`}
            aria-current={n === ciclo.semana_del_bloque ? 'step' : undefined}
          >
            <span>{n === 5 ? 'Desc.' : n}</span>
          </li>
        ))}
      </ol>
      <p className="tenue">{semana.detalle}</p>
      <p className="ciclo__pie">
        {diasPorSemana ? (
          <span>
            Esta semana: <strong className="cifra">{sesionesSemana}</strong> de {diasPorSemana} entrenamientos
          </span>
        ) : null}
        {ciclo.proxima_descarga && <span className="tenue">Descarga desde el {fechaConDia(ciclo.proxima_descarga)}</span>}
      </p>
    </section>
  );
}
