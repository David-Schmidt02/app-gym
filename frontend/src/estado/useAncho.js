import { useEffect, useRef, useState } from 'react';

/** Ancho en px del elemento, actualizado al redimensionar (para dibujar SVG sin escalar el texto). */
export function useAncho(inicial = 320) {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(inicial);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return undefined;
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.round(entrada.contentRect.width)));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return [ref, ancho];
}

/** Sigue una media query de CSS (ej. para vistas maestro-detalle en escritorio). */
export function useEsEscritorio(consulta = '(min-width: 1100px)') {
  const [coincide, setCoincide] = useState(() => window.matchMedia(consulta).matches);

  useEffect(() => {
    const media = window.matchMedia(consulta);
    const actualizar = (e) => setCoincide(e.matches);
    media.addEventListener('change', actualizar);
    return () => media.removeEventListener('change', actualizar);
  }, [consulta]);

  return coincide;
}
