import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { SesionContexto } from './contextos';

export default function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState({ id: 'usuario', nombre: 'David', email: 'david@gym.local' });

  useEffect(() => {
    api('/auth/yo')
      .then(setUsuario)
      .catch(() => {});
  }, []);

  const actualizarNombre = useCallback(async (nombre) => {
    const nuevo = await api('/perfil', { method: 'PUT', body: { nombre } });
    setUsuario(nuevo);
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      actualizarNombre,
      ingresar: async () => {},
      registrar: async () => {},
      salir: () => {},
    }),
    [usuario, actualizarNombre],
  );

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}
