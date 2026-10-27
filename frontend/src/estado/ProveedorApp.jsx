import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppContexto } from './contextos';

/** Refresco de datos después de guardar y avisos breves. */
export default function ProveedorApp({ children }) {
  const [version, setVersion] = useState(0);
  const [aviso, setAviso] = useState(null);
  const temporizador = useRef(null);

  const refrescar = useCallback(() => setVersion((v) => v + 1), []);

  const avisar = useCallback((texto) => {
    clearTimeout(temporizador.current);
    setAviso({ texto, id: Date.now() });
    temporizador.current = setTimeout(() => setAviso(null), 2600);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const valor = useMemo(() => ({ version, refrescar, avisar }), [version, refrescar, avisar]);

  return (
    <AppContexto.Provider value={valor}>
      {children}
      <div className="aviso-zona" aria-live="polite">
        {aviso && (
          <p key={aviso.id} className="aviso">
            {aviso.texto}
          </p>
        )}
      </div>
    </AppContexto.Provider>
  );
}
