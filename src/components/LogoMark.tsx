// Marca de Espacia: una "E" hecha con franjas de horario; la del medio, en ámbar, es el turno reservado.
export default function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="15 12 34 40" className={className} aria-hidden="true">
      <rect x="17" y="14" width="9" height="36" rx="4.5" fill="#fff" />
      <rect x="17" y="14" width="30" height="9" rx="4.5" fill="#fff" />
      <rect x="17" y="41" width="30" height="9" rx="4.5" fill="#fff" />
      <rect x="30" y="27.5" width="17" height="9" rx="4.5" fill="#FFC53D" />
    </svg>
  );
}
