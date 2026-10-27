import { ICONOS_UI } from '../lib/iconos';

/** Ícono de la interfaz por nombre de función ("borrar", "entrenar"…). */
export default function Icono({ nombre, tamano = 22, grosor = 1.8, className }) {
  const Componente = ICONOS_UI[nombre];
  return <Componente size={tamano} strokeWidth={grosor} className={className} aria-hidden="true" />;
}
