// Icônes des jeux à deux (choix du défi) : trait d'encre, couleurs pastel de l'interface.
const INK = "#2B2730";

export function GameIcon({ type, size = 30 }: { type: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", stroke: INK, strokeWidth: 1.8, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (type) {
    case "memory":
      return <svg {...p} fill="#fff"><rect x="2.5" y="5" width="9" height="13" rx="2" /><rect x="12.5" y="5" width="9" height="13" rx="2" /><circle cx="7" cy="11.5" r="1.8" fill="#FF9DB5" stroke="none" /><circle cx="17" cy="11.5" r="1.8" fill="#FF9DB5" stroke="none" /></svg>;
    case "battleship":
      return <svg {...p} fill="#fff"><path d="M3 14h18l-3 5H6z" fill="#BFE3F5" /><path d="M12 3v11M12 4l6 7h-6" /></svg>;
    case "orapa":
      return <svg {...p}><path d="M7 4h10l4 5-9 11L3 9z" fill="#E2D6FF" /><path d="M3 9h18M9 4l3 16 3-16" fill="none" /></svg>;
    case "dames":
      return <svg {...p}><circle cx="8" cy="12" r="5" fill={INK} /><circle cx="16" cy="12" r="5" fill="#fff" /></svg>;
    default:
      return <svg {...p} fill="#fff"><rect x="3" y="3" width="18" height="18" rx="5" /></svg>;
  }
}

/** Icône du défi du jour : une petite grille colorée (le défi change chaque jour). */
export function DailyIcon({ size = 44 }: { size?: number }) {
  const c = ["#93D673", "#FFD54A", "#E6E1EC", "#E6E1EC", "#93D673", "#FFD54A", "#93D673", "#93D673", "#93D673"];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="5" fill="#fff" stroke={INK} strokeWidth="1.6" />
      {c.map((f, i) => <rect key={i} x={4.5 + (i % 3) * 5.3} y={4.5 + Math.floor(i / 3) * 5.3} width="4.3" height="4.3" rx="1" fill={f} />)}
    </svg>
  );
}
