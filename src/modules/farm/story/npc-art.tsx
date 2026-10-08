// Portraits des habitants du hameau (SVG 64×64), dans l'esprit des personnages de l'app.
import type { Who } from "./types";

const ART: Record<Who, React.ReactNode> = {
  mirabelle: (
    <>
      <defs>
        <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f9ff" />
          <stop offset="1" stopColor="#c8dcf4" stopOpacity=".55" />
        </linearGradient>
      </defs>
      <path d="M10 58V30C10 16 20 8 32 8s22 8 22 22v28l-5-4-5 5-6-5-6 5-5-5-5 4z" fill="url(#gh)" stroke="#a9c3e0" strokeWidth="1.5" />
      <circle cx="32" cy="9" r="7" fill="#d9dde6" stroke="#b3bac8" strokeWidth="1.2" />
      <circle cx="32" cy="3.5" r="3.5" fill="#d9dde6" stroke="#b3bac8" strokeWidth="1.2" />
      <circle cx="24" cy="30" r="6" fill="none" stroke="#7a6a58" strokeWidth="1.6" />
      <circle cx="40" cy="30" r="6" fill="none" stroke="#7a6a58" strokeWidth="1.6" />
      <path d="M30 30h4" stroke="#7a6a58" strokeWidth="1.6" />
      <circle cx="24" cy="30" r="2" fill="#35405a" />
      <circle cx="40" cy="30" r="2" fill="#35405a" />
      <circle cx="19" cy="38" r="3" fill="#f6b6b6" opacity=".75" />
      <circle cx="45" cy="38" r="3" fill="#f6b6b6" opacity=".75" />
      <path d="M26 41q6 5 12 0" fill="none" stroke="#7a4a4a" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  pistache: (
    <>
      <path d="M8 6l15 14M56 6 41 20" stroke="#d96a1d" strokeWidth="10" strokeLinecap="round" />
      <path d="M11 9l9 9M53 9l-9 9" stroke="#3a2a22" strokeWidth="4" strokeLinecap="round" />
      <path d="M8 26c0-10 10-16 24-16s24 6 24 16c0 12-10 28-24 28S8 38 8 26z" fill="#ee8a2b" />
      <path d="M32 54c-9 0-16-7-18-14 6 4 12 4 18 0 6 4 12 4 18 0-2 7-9 14-18 14z" fill="#fff6e8" />
      <ellipse cx="23" cy="28" rx="3" ry="3.6" fill="#2a1d18" />
      <ellipse cx="41" cy="28" rx="3" ry="3.6" fill="#2a1d18" />
      <circle cx="24" cy="26.8" r="1" fill="#fff" />
      <circle cx="42" cy="26.8" r="1" fill="#fff" />
      <ellipse cx="32" cy="40" rx="3.4" ry="2.6" fill="#2a1d18" />
      <path d="M32 42.5v3m0 0q-3 2-5 0m5 0q3 2 5 0" fill="none" stroke="#2a1d18" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  colonel: (
    <>
      <path d="M12 16 18 4l8 8M52 16 46 4l-8 8" fill="#7b5a3a" stroke="#5a3f27" strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="32" cy="34" rx="24" ry="26" fill="#9a7650" />
      <path d="M12 28h40" stroke="#5a3f27" strokeWidth="6" strokeLinecap="round" />
      <path d="M10 22c4-9 12-12 22-12s18 3 22 12z" fill="#2f4a6b" />
      <rect x="22" y="14" width="20" height="5" rx="2" fill="#e0b44c" />
      <circle cx="23" cy="32" r="8" fill="#fff8ec" />
      <circle cx="41" cy="32" r="8" fill="#fff8ec" />
      <circle cx="23" cy="33" r="3.4" fill="#2a1d18" />
      <circle cx="41" cy="33" r="3.4" fill="#2a1d18" />
      <circle cx="41" cy="32" r="9.5" fill="none" stroke="#d6a52a" strokeWidth="1.6" />
      <path d="M41 41.5q4 6 3 12" stroke="#d6a52a" strokeWidth="1" fill="none" />
      <path d="M32 38l-4 6h8z" fill="#e0b44c" />
      <path d="M32 46c-8-1-14 4-20 2 4 6 12 8 20 4 8 4 16 2 20-4-6 2-12-3-20-2z" fill="#f4efe6" stroke="#cfc6b5" strokeWidth="1" />
    </>
  ),
  zinnia: (
    <>
      <path d="M11 34c0-14 8-24 21-24s21 10 21 24v18H11z" fill="#6b4a33" />
      <ellipse cx="32" cy="36" rx="16" ry="18" fill="#f6d2b0" />
      <path d="M16 30c4-8 12-12 22-10 4 1 8 4 10 10-8-4-20-3-32 0z" fill="#6b4a33" />
      <circle cx="26" cy="37" r="2.3" fill="#2a1d18" />
      <circle cx="38" cy="37" r="2.3" fill="#2a1d18" />
      <circle cx="20" cy="43" r="3" fill="#f2a1a1" opacity=".6" />
      <circle cx="44" cy="43" r="3" fill="#f2a1a1" opacity=".6" />
      <path d="M28 46q4 3 8 0" fill="none" stroke="#8a4a3a" strokeWidth="1.6" strokeLinecap="round" />
      {[[14, 18, "#f26b8a"], [24, 11, "#f5c542"], [34, 10, "#f26b8a"], [44, 14, "#9b7ee0"], [50, 22, "#f5c542"]].map(([x, y, c]) => (
        <g key={`${x}${y}`}>
          <circle cx={x as number} cy={y as number} r="4.2" fill={c as string} />
          <circle cx={x as number} cy={y as number} r="1.6" fill="#fff4c8" />
        </g>
      ))}
    </>
  ),
};

export function NpcPortrait({ who, size = 64 }: { who: Who; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {ART[who]}
    </svg>
  );
}
