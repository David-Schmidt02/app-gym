import { useEffect, useState } from 'react';
import Icono from './Icono';

const reloj = (segundos) => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

/** Cuenta regresiva entre series. `hasta` es el instante (ms) en que termina; vibra al llegar a cero. */
export default function Descanso({ hasta, total, onSumar, onCerrar }) {
  const [ahora, setAhora] = useState(() => Date.now());
  const restante = Math.max(0, Math.ceil((hasta - ahora) / 1000));

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (restante === 0) navigator.vibrate?.([200, 100, 200]);
  }, [restante]);

  return (
    <div className={`descanso${restante === 0 ? ' es-listo' : ''}`} role="timer" aria-live={restante === 0 ? 'assertive' : 'off'}>
      <Icono nombre="descanso" tamano={20} />
      <span className="descanso__texto">
        {restante === 0 ? '¡A la próxima serie!' : 'Descanso'}
        <strong className="cifra">{reloj(restante)}</strong>
      </span>
      <span className="descanso__barra" style={{ '--avance': `${Math.min(1, 1 - restante / total) * 100}%` }} aria-hidden="true" />
      <button type="button" className="boton boton--chico" onClick={onSumar}>
        +15 s
      </button>
      <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar descanso">
        <Icono nombre="cerrar" tamano={18} />
      </button>
    </div>
  );
}
