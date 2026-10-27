import { useState } from 'react';
import { useAncho } from '../estado/useAncho';

const ALTO = 220;
const MARGEN = { arriba: 16, derecha: 16, abajo: 28, izquierda: 48 };

/** Marcas redondas del eje entre el mínimo y el máximo (el eje no arranca en 0: importan las diferencias). */
function marcas(minimo, maximo) {
  const rango = Math.max(maximo - minimo, 1);
  const crudo = rango / 4;
  const potencia = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= crudo);
  const desde = Math.floor(minimo / paso) * paso;
  const hasta = Math.ceil(maximo / paso) * paso;
  const lista = [];
  for (let v = desde; v <= hasta + paso / 2; v += paso) lista.push(Math.round(v * 100) / 100);
  return lista;
}

/**
 * Gráfico de líneas sobre puntos ordenados en el tiempo.
 * `series`: [{ clave, nombre, clase }]; un punto puede marcarse `hueco` (ej. una descarga) y se dibuja vacío.
 */
export default function Lineas({ puntos, series, etiquetaX, formato, descripcion }) {
  const [ref, ancho] = useAncho();
  const [indice, setIndice] = useState(null);

  const valores = puntos.flatMap((p) => series.map((s) => p[s.clave]).filter((v) => v !== null && v !== undefined));
  const ejes = marcas(Math.min(...valores), Math.max(...valores));
  const [yMin, yMax] = [ejes[0], ejes.at(-1)];

  const anchoUtil = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 100);
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const x = (i) => MARGEN.izquierda + (puntos.length === 1 ? anchoUtil / 2 : (i / (puntos.length - 1)) * anchoUtil);
  const y = (v) => MARGEN.arriba + (1 - (v - yMin) / (yMax - yMin || 1)) * altoUtil;
  // Con muchos puntos, solo algunas etiquetas en el eje X
  const cadaCuanto = Math.max(1, Math.ceil(puntos.length / Math.max(2, Math.floor(anchoUtil / 64))));

  const elegirPorPuntero = (e) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const relativo = (e.clientX - caja.left - MARGEN.izquierda) / anchoUtil;
    setIndice(Math.max(0, Math.min(puntos.length - 1, Math.round(relativo * (puntos.length - 1)))));
  };

  const moverConTeclado = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const actual = indice ?? puntos.length - 1;
    setIndice(Math.max(0, Math.min(puntos.length - 1, actual + (e.key === 'ArrowRight' ? 1 : -1))));
  };

  const punto = indice !== null ? puntos[indice] : null;
  const tooltipIzquierda = indice !== null ? Math.min(Math.max(x(indice) - 90, 0), ancho - 180) : 0;

  return (
    <div className="grafico-lineas" ref={ref}>
      <svg
        width={ancho}
        height={ALTO}
        role="img"
        aria-label={`${descripcion} Usá las flechas para recorrer los puntos; el detalle también está en la tabla.`}
        tabIndex={0}
        onPointerMove={elegirPorPuntero}
        onPointerLeave={() => setIndice(null)}
        onKeyDown={moverConTeclado}
        onBlur={() => setIndice(null)}
      >
        {ejes.map((v) => (
          <g key={v}>
            <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(v)} y2={y(v)} className="eje-guia" />
            <text x={MARGEN.izquierda - 10} y={y(v)} dy="0.32em" textAnchor="end" className="eje-texto">
              {formato(v)}
            </text>
          </g>
        ))}
        {puntos.map((p, i) =>
          i % cadaCuanto === 0 || i === puntos.length - 1 ? (
            <text key={i} x={x(i)} y={ALTO - 8} textAnchor="middle" className="eje-texto">
              {etiquetaX(p)}
            </text>
          ) : null,
        )}
        {indice !== null && <line x1={x(indice)} x2={x(indice)} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} className="mira" />}
        {series.map((s) => {
          const conValor = puntos.map((p, i) => [p, i]).filter(([p]) => p[s.clave] !== null && p[s.clave] !== undefined);
          return (
            <g key={s.clave} className={`serie ${s.clase}`}>
              <polyline points={conValor.map(([p, i]) => `${x(i)},${y(p[s.clave])}`).join(' ')} />
              {conValor.map(([p, i]) => (
                <circle key={i} cx={x(i)} cy={y(p[s.clave])} r={indice === i ? 5.5 : 4} className={p.hueco ? 'es-hueco' : undefined} />
              ))}
            </g>
          );
        })}
      </svg>
      {punto && (
        <div className="tooltip" style={{ left: tooltipIzquierda }} role="status">
          <p className="tooltip__titulo">{punto.titulo}</p>
          {series.map(
            (s) =>
              punto[s.clave] !== null &&
              punto[s.clave] !== undefined && (
                <p key={s.clave} className="tooltip__fila">
                  <span className={`clave-linea ${s.clase}`} aria-hidden="true" />
                  <strong>{formato(punto[s.clave])}</strong>
                  <span>{s.nombre}</span>
                </p>
              ),
          )}
          {punto.nota && <p className="tooltip__nota">{punto.nota}</p>}
        </div>
      )}
    </div>
  );
}
