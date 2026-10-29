import { useRef, useState } from 'react';

const PX_POR_PASO = 22;
const UMBRAL_ARRASTRE = 8;

/** Pasos según lo arrastrado: crece más rápido que lineal para llegar lejos sin recorrer media pantalla. */
function pasosPorArrastre(desplazamiento) {
  return Math.sign(desplazamiento) * Math.floor((Math.abs(desplazamiento) / PX_POR_PASO) ** 1.35);
}

/**
 * Selector numérico sin teclado: una tira de números que se arrastra en horizontal (hacia la izquierda trae
 * los mayores) o se tocan los valores vecinos.
 * El arrastre vertical queda para desplazar la página. Con teclado responde a las flechas como un spinbutton.
 */
export default function Carrusel({
  valor,
  onCambiar,
  paso = 1,
  min = 0,
  max = 999,
  inicial = min,
  formatear = String,
  unidad = '',
  vacio = '',
  etiqueta,
  disabled = false,
  className = '',
}) {
  const [direccion, setDireccion] = useState(null);
  const arrastre = useRef(null);
  const tieneValor = valor !== null && valor !== undefined;

  const fijar = (nuevo) => {
    const acotado = Math.min(max, Math.max(min, Number((Math.round(nuevo / paso) * paso).toFixed(2))));
    if (acotado === valor) return;
    setDireccion(tieneValor && acotado < valor ? 'baja' : 'sube');
    onCambiar(acotado);
  };

  const mover = (pasos) => fijar((tieneValor ? valor : inicial) + (tieneValor ? pasos * paso : 0));

  const alApoyar = (e) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    arrastre.current = { x: e.clientX, y: e.clientY, base: tieneValor ? valor : inicial, movido: false };
  };

  const alMover = (e) => {
    const a = arrastre.current;
    if (!a) return;
    const dx = e.clientX - a.x;
    if (!a.movido) {
      if (Math.abs(dx) < UMBRAL_ARRASTRE && Math.abs(e.clientY - a.y) < UMBRAL_ARRASTRE) return;
      if (Math.abs(e.clientY - a.y) > Math.abs(dx)) {
        arrastre.current = null;
        return;
      }
      a.movido = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    fijar(a.base + pasosPorArrastre(-dx) * paso);
  };

  const alSoltar = (e) => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a || a.movido) return;
    const zona = e.target.closest('[data-zona]')?.dataset.zona;
    if (zona === 'menos') mover(-1);
    else if (zona === 'mas') mover(1);
    else if (!tieneValor) fijar(inicial);
  };

  const alTeclear = (e) => {
    const teclas = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
    if (e.key in teclas) mover(teclas[e.key]);
    else if (e.key === 'Home') fijar(min);
    else if (e.key === 'End') fijar(max);
    else return;
    e.preventDefault();
  };

  const vecino = (signo) => {
    const n = (valor ?? 0) + signo * paso;
    return tieneValor && n >= min && n <= max ? formatear(n) : '';
  };

  return (
    <div
      role="spinbutton"
      tabIndex={disabled ? -1 : 0}
      aria-label={etiqueta}
      aria-valuenow={tieneValor ? valor : undefined}
      aria-valuetext={tieneValor ? `${formatear(valor)} ${unidad}`.trim() : vacio || 'Sin valor'}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-disabled={disabled || undefined}
      className={`carrusel${disabled ? ' es-fijo' : ''}${tieneValor ? '' : ' es-vacio'}${className ? ` ${className}` : ''}`}
      onPointerDown={alApoyar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={() => (arrastre.current = null)}
      onKeyDown={disabled ? undefined : alTeclear}
    >
      {!disabled && (
        <span className="carrusel__vecino" data-zona="menos" aria-hidden="true">
          {vecino(-1)}
        </span>
      )}
      <span className="carrusel__centro">
        <span key={tieneValor ? valor : 'vacio'} className="carrusel__valor cifra" data-direccion={direccion ?? undefined}>
          {tieneValor ? formatear(valor) : vacio}
        </span>
        {unidad && <span className="carrusel__unidad">{unidad}</span>}
      </span>
      {!disabled && (
        <span className="carrusel__vecino" data-zona="mas" aria-hidden="true">
          {vecino(1)}
        </span>
      )}
    </div>
  );
}
