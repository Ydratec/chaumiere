// Logo Chaumière : une tête de chat de la couleur d'accent. Le même dessin sert d'icône d'app (app/icon.svg).
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="text-indigo-600" aria-hidden>
      <path d="M7 24 8 5l12 7zM41 24 40 5 28 12z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="24" cy="28" rx="17" ry="15" fill="currentColor" />
      <circle cx="17" cy="26" r="2.6" fill="#fff" />
      <circle cx="31" cy="26" r="2.6" fill="#fff" />
      <path d="M22 31h4l-2 2.4z" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight">
      <Logo size={size} /> Chaumière
    </span>
  );
}
