const TRAZOS = {
  pecho: (
    <>
      <path
        d="M9.5 3.8 L12 5 L14.5 3.8 M4.2 18.5 L4.6 8.2 C4.8 6 6.8 4.5 9.5 3.8 M14.5 3.8 C17.2 4.5 19.2 6 19.4 8.2 L19.8 18.5"
        className="musculo__base"
      />
      <path
        d="M5.8 8.2 C7.8 7.3 10.4 7.6 11.4 9.2 V13 C9.4 13.7 6.7 13.3 5.8 11.4 Z M18.2 8.2 C16.2 7.3 13.6 7.6 12.6 9.2 V13 C14.6 13.7 17.3 13.3 18.2 11.4 Z"
        className="musculo__foco"
      />
    </>
  ),
  espalda: (
    <>
      <path d="M9.2 4 L12 3.5 L14.8 4 M12 4 V20 M7.5 17.5 L8 20 M16.5 17.5 L16 20" className="musculo__base" />
      <path
        d="M11 6.5 L4.8 7.4 C4.7 11.4 6.8 15 11 17.4 Z M13 6.5 L19.2 7.4 C19.3 11.4 17.2 15 13 17.4 Z"
        className="musculo__foco"
      />
    </>
  ),
  hombros: (
    <>
      <path d="M9.5 4.2 L12 5.4 L14.5 4.2 M8.2 9.5 H15.8 M7.2 13 L7.6 19.5 M16.8 13 L16.4 19.5" className="musculo__base" />
      <path
        d="M8 5.4 C5 5.8 3.2 8.2 3.4 11.4 C3.5 12.7 4.7 13.2 5.8 12.4 C6.9 11.6 7.7 9.6 8 7.2 Z M16 5.4 C19 5.8 20.8 8.2 20.6 11.4 C20.5 12.7 19.3 13.2 18.2 12.4 C17.1 11.6 16.3 9.6 16 7.2 Z"
        className="musculo__foco"
      />
    </>
  ),
  biceps: (
    <>
      <path
        d="M12.4 13 A5 5 0 0 1 21.5 15 C21.5 18.8 17.6 21.5 12.8 21.5 C8.8 21.5 4.9 20.7 2.7 19.1 C2.3 18.8 2.1 18.3 2.1 17.8 C2.2 12.5 2.8 2.5 10 2.5 A2.8 2.8 0 0 1 12.8 5.3 A1.9 1.9 0 0 1 10.9 7.2 C9.9 7.2 9.3 6.8 9 6.2 M9.9 7 C8.1 8.1 9.4 12.8 8 14.8"
        className="musculo__base"
      />
      <path d="M8.2 15.2 A4.6 4.6 0 0 1 16 14.4 C14.8 16.8 10.4 17 8.2 15.2 Z" className="musculo__foco" />
    </>
  ),
  triceps: (
    <>
      <path d="M5.5 6.5 C5.5 4.4 7.3 3.2 9.6 3.8 M8.6 9.6 L12.2 13.2 L10.2 19.8 L13.2 20.5 L15.6 13.6" className="musculo__base" />
      <path d="M9.8 4.2 C13.8 4.8 16.8 7.8 16.2 13 L12.8 12.6 C12.7 9.6 11.1 7.4 8.8 6.8 Z" className="musculo__foco" />
    </>
  ),
  cuadriceps: (
    <>
      <path d="M6.2 4.2 H17.8 M7.4 16.8 V20.5 M10.4 16.8 V20.5 M13.6 16.8 V20.5 M16.6 16.8 V20.5" className="musculo__base" />
      <path
        d="M6.4 6.4 H11 L10.6 15.5 C9.6 16.4 7.6 16.4 6.7 15.3 C5.7 12.4 5.7 9.4 6.4 6.4 Z M13 6.4 H17.6 C18.3 9.4 18.3 12.4 17.3 15.3 C16.4 16.4 14.4 16.4 13.4 15.5 Z"
        className="musculo__foco"
      />
    </>
  ),
  isquios: (
    <>
      <path d="M6.8 4 H17.2 M8.2 17.4 V20.5 M15.8 17.4 V20.5" className="musculo__base" />
      <path
        d="M6.8 6 C5.3 7.6 5.6 10.5 8.4 11 C10.3 11.2 11.5 10.3 12 9 C12.5 10.3 13.7 11.2 15.6 11 C18.4 10.5 18.7 7.6 17.2 6 Z M7.2 11.6 H10.8 L10.3 16.6 H7.7 Z M13.2 11.6 H16.8 L16.3 16.6 H13.7 Z"
        className="musculo__foco"
      />
    </>
  ),
  gemelos: (
    <>
      <path d="M8.5 3.8 H14.2 M9.4 3.8 V17 L6.4 19.2 C5.9 19.6 6.2 20.3 7 20.3 H14.4 V16.8" className="musculo__base" />
      <path d="M12.2 5 C16.6 5.6 17.8 9.6 15 13.6 L14.2 16.6 H12.2 Z" className="musculo__foco" />
    </>
  ),
  core: (
    <>
      <path d="M5.4 4.2 C6.6 9 6.6 15 5.4 19.8 M18.6 4.2 C17.4 9 17.4 15 18.6 19.8" className="musculo__base" />
      <rect x="8.6" y="5.2" width="6.8" height="13.6" rx="2" className="musculo__foco" />
      <path d="M12 5.4 V18.6 M8.8 9.7 H15.2 M8.8 14.3 H15.2" className="musculo__linea" />
    </>
  ),
};

/** Silueta anatómica minimalista en dos tonos con el grupo muscular resaltado en color de acento. */
export default function IconoMusculo({ grupo, tamano = 18, conFondo = false, className = '' }) {
  const trazos = TRAZOS[grupo];
  if (!trazos) return null;

  const svg = (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      className={`musculo${!conFondo && className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      {trazos}
    </svg>
  );

  if (!conFondo) return svg;

  return (
    <span className={`insignia-musculo${className ? ` ${className}` : ''}`} aria-hidden="true">
      {svg}
    </span>
  );
}
