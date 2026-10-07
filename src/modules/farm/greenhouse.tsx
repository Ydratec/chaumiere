// Décor de la serre : sol en tomettes (une par case de la grille), verrière au fond, lumière du toit.

const TILE = ["#ead2b0", "#e4c9a3", "#efd9ba", "#e7cea9"];
const shade = (x: number, y: number) => TILE[(x * 7 + y * 13 + ((x * y) % 3)) % TILE.length];

/** Sol carrelé : chaque case de la grille est une tomette (légères variations, joints visibles). */
export function GreenhouseFloor({ w, h }: { w: number; h: number }) {
  return (
    <svg viewBox={`0 0 ${w * 24} ${h * 24}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
      <rect width={w * 24} height={h * 24} fill="#cfb38c" />
      {Array.from({ length: w * h }, (_, i) => {
        const x = i % w, y = Math.floor(i / w);
        return (
          <g key={i}>
            <rect x={x * 24 + 0.8} y={y * 24 + 0.8} width="22.4" height="22.4" rx="2.2" fill={shade(x, y)} />
            <rect x={x * 24 + 0.8} y={y * 24 + 0.8} width="22.4" height="3" rx="1.5" fill="#fff" opacity=".18" />
            {(x * 5 + y * 3) % 7 === 0 && <circle cx={x * 24 + 7 + ((x + y) % 3) * 4} cy={y * 24 + 15} r=".8" fill="#c9a57a" />}
          </g>
        );
      })}
    </svg>
  );
}

/** Verrière du fond (au-dessus de la grille, non praticable) : vitres, montants, verdure dehors. */
export function GreenhouseWall({ w }: { w: number }) {
  const W = w * 24;
  return (
    <svg viewBox={`0 0 ${W} 80`} preserveAspectRatio="none" className="block w-full" style={{ aspectRatio: `${W} / 80` }} aria-hidden>
      <defs>
        <linearGradient id="gh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9f0f7" />
          <stop offset="1" stopColor="#eef8f4" />
        </linearGradient>
      </defs>
      <rect width={W} height="80" fill="url(#gh-sky)" />
      {/* verdure dehors, floue derrière le verre */}
      {Array.from({ length: Math.ceil(W / 30) }, (_, i) => (
        <circle key={i} cx={i * 30 + 10} cy={58 + (i % 3) * 4} r={16 + (i % 4) * 3} fill={i % 2 ? "#b9dcae" : "#a8d39c"} opacity=".7" />
      ))}
      {/* reflets */}
      {Array.from({ length: Math.ceil(W / 96) }, (_, i) => (
        <path key={i} d={`M${i * 96 + 20} 66 L${i * 96 + 44} 6 L${i * 96 + 52} 6 L${i * 96 + 28} 66z`} fill="#fff" opacity=".35" />
      ))}
      {/* montants de la verrière */}
      {Array.from({ length: w / 2 + 1 }, (_, i) => (
        <rect key={i} x={i * 48 - 1.5} y="0" width="3" height="66" fill="#f8f6f1" />
      ))}
      <rect y="0" width={W} height="4" fill="#f8f6f1" />
      <rect y="30" width={W} height="2.5" fill="#f8f6f1" />
      {/* soubassement en briques */}
      <rect y="66" width={W} height="14" fill="#c98b62" />
      {Array.from({ length: Math.ceil(W / 16) }, (_, i) => (
        <g key={i}>
          <rect x={i * 16 + 0.5} y="66.5" width="15" height="6" rx="1" fill="#d39a72" />
          <rect x={i * 16 - 7.5} y="73.5" width="15" height="6" rx="1" fill="#cf946b" />
        </g>
      ))}
      <rect y="64" width={W} height="3" fill="#a9714d" />
    </svg>
  );
}

/** Rayons de lumière qui tombent du toit de verre (par-dessus, sans bloquer les touchers). */
export const GreenhouseLight = () => (
  <div
    className="pointer-events-none absolute inset-0"
    style={{
      background:
        "linear-gradient(112deg, rgba(255,255,255,.22) 0%, transparent 28%, rgba(255,255,255,.12) 46%, transparent 60%, rgba(255,255,255,.1) 78%, transparent 90%)",
    }}
  />
);
