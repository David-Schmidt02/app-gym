import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Marco from './componentes/Marco';
import { useSesion } from './estado/contextos';
import ProveedorApp from './estado/ProveedorApp';
import Ajustes from './paginas/Ajustes';
import Cuerpo from './paginas/Cuerpo';
import Entrenar from './paginas/Entrenar';
import Historial from './paginas/Historial';
import Hoy from './paginas/Hoy';
import Ingreso from './paginas/Ingreso';
import Progreso from './paginas/Progreso';
import Rutina from './paginas/Rutina';
import SesionGuardada from './paginas/SesionGuardada';

export default function App() {
  const { usuario } = useSesion();

  if (usuario === undefined) return <div className="arranque" aria-busy="true" />;
  if (usuario === null) return <Ingreso />;

  return (
    <BrowserRouter>
      <ProveedorApp>
        <Routes>
          <Route element={<Marco />}>
            <Route index element={<Hoy />} />
            <Route path="entrenar" element={<Entrenar />} />
            <Route path="entrenar/:dia" element={<Entrenar />} />
            <Route path="historial" element={<Historial />} />
            <Route path="historial/:id" element={<SesionGuardada />} />
            <Route path="progreso" element={<Progreso />} />
            <Route path="cuerpo" element={<Cuerpo />} />
            <Route path="rutina" element={<Rutina />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ProveedorApp>
    </BrowserRouter>
  );
}
