import { Dumbbell } from 'lucide-react';

/** Logo (la mancuerna) y el nombre subrayado a mano. */
export default function Marca({ grande = false }) {
  return (
    <span className={`marca${grande ? ' marca--grande' : ''}`}>
      <span className="marca__logo" aria-hidden="true">
        <Dumbbell size={grande ? 30 : 20} strokeWidth={2.2} />
      </span>
      <span className="marca__palabra">
        gym
        <svg className="marca__subrayado" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 5.5C20 2.5 45 2 62 3.6S90 6.2 98 3" fill="none" stroke="var(--acento)" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}
