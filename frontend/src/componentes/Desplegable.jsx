import { useEffect, useId, useRef, useState } from 'react';
import Icono from './Icono';

/**
 * Campo que despliega su panel debajo, dentro del flujo: así no lo recorta la hoja que lo contiene.
 * `children` recibe `cerrar` para que el panel se cierre al elegir.
 */
export default function Desplegable({
  etiqueta,
  ariaLabel,
  resumen,
  icono = null,
  punteado = false,
  disabled = false,
  className = '',
  children,
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef(null);
  const id = useId();
  const visible = abierto && !disabled;

  useEffect(() => {
    if (!visible) return undefined;
    const afuera = (e) => !raiz.current?.contains(e.target) && setAbierto(false);
    document.addEventListener('pointerdown', afuera);
    return () => document.removeEventListener('pointerdown', afuera);
  }, [visible]);

  const cerrar = () => {
    setAbierto(false);
    document.getElementById(`${id}-disparador`)?.focus();
  };

  return (
    <div
      className={`desplegable${visible ? ' es-abierto' : ''}${className ? ` ${className}` : ''}`}
      ref={raiz}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && visible) {
          // Que el Escape no cierre también la hoja modal
          e.preventDefault();
          e.stopPropagation();
          cerrar();
        }
      }}
    >
      {etiqueta && (
        <span className="desplegable__etiqueta" id={`${id}-etiqueta`}>
          {etiqueta}
        </span>
      )}
      <button
        type="button"
        id={`${id}-disparador`}
        className={`desplegable__disparador${punteado ? ' desplegable__disparador--punteado' : ''}`}
        aria-expanded={visible}
        aria-controls={`${id}-panel`}
        aria-labelledby={etiqueta ? `${id}-etiqueta ${id}-valor` : undefined}
        aria-label={!etiqueta ? ariaLabel : undefined}
        disabled={disabled}
        onClick={() => setAbierto((x) => !x)}
      >
        {icono}
        <span className="desplegable__valor" id={`${id}-valor`}>
          {resumen}
        </span>
        <Icono nombre="abajo" tamano={18} className="desplegable__flecha" />
      </button>
      {visible && (
        <div className="desplegable__panel" id={`${id}-panel`}>
          {children(cerrar)}
        </div>
      )}
    </div>
  );
}
