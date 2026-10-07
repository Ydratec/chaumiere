// Chats minimalistes : 8 robes (+ humeur). Avatars par défaut, cartes de Memory et réactions.

export const MOODS = ["happy", "love", "laugh", "wow", "sad", "cool"] as const;
export type Mood = (typeof MOODS)[number];

type Coat = { fur: string; dark: string; mark: "stripes" | "muzzle" | "patch" | "calico" | "none"; night?: boolean };
export const COATS: Coat[] = [
  { fur: "#f2a65a", dark: "#c9722b", mark: "stripes" }, // roux tigré
  { fur: "#3f3f46", dark: "#27272a", mark: "none", night: true }, // noir
  { fur: "#a1a1aa", dark: "#71717a", mark: "muzzle" }, // gris
  { fur: "#f4f4f5", dark: "#d4d4d8", mark: "patch" }, // blanc à tache rousse
  { fur: "#ead9b8", dark: "#c9b48a", mark: "none" }, // crème
  { fur: "#8b5a3c", dark: "#6b412a", mark: "stripes", night: true }, // brun tigré
  { fur: "#94a3b8", dark: "#64748b", mark: "muzzle" }, // gris bleu
  { fur: "#fafafa", dark: "#d4d4d8", mark: "calico" }, // écaille
];

const INK = "#27272a";
const PINK = "#f9a8b8";

export function Cat({ coat = 0, mood = "happy", size = 40 }: { coat?: number; mood?: Mood; size?: number }) {
  const c = COATS[((coat % 8) + 8) % 8];
  const eye = c.night ? "#fef3c7" : INK;
  const line = { fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const dot = (cx: number, r = 2.3) => <circle cx={cx} cy={26} r={r} fill={eye} />;
  const heart = (cx: number) => <path d={`M${cx} 29c-4-2.6-4.6-5.2-3-6.4 1.2-.9 2.6-.3 3 .9.4-1.2 1.8-1.8 3-.9 1.6 1.2 1 3.8-3 6.4z`} fill="#e11d48" />;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      {/* oreilles + tête */}
      <path d="M7 24 8 5l12 7zM41 24 40 5 28 12z" fill={c.fur} stroke={c.fur} strokeWidth="3" strokeLinejoin="round" />
      <path d="M11 16 11.5 9l4.5 3.2zM37 16 36.5 9 32 12.2z" fill={PINK} />
      <ellipse cx="24" cy="28" rx="17" ry="15" fill={c.fur} />
      {/* marques */}
      {c.mark === "stripes" && <path d="M24 14v5M19 15l1 4M29 15l-1 4" stroke={c.dark} {...line} />}
      {c.mark === "muzzle" && <ellipse cx="24" cy="35" rx="8" ry="5" fill="#fff" opacity=".6" />}
      {c.mark === "patch" && <circle cx="16" cy="23" r="7" fill="#f2a65a" />}
      {c.mark === "calico" && <><circle cx="15" cy="22" r="6.5" fill="#f2a65a" /><circle cx="35" cy="19" r="5.5" fill="#3f3f46" /></>}
      {/* yeux */}
      {mood === "love" ? <>{heart(17)}{heart(31)}</>
        : mood === "laugh" ? <path d="M13 27q4-6 8 0M27 27q4-6 8 0" stroke={eye} {...line} />
        : mood === "cool" ? <><rect x="11" y="22" width="12" height="7" rx="3" fill="#18181b" /><rect x="25" y="22" width="12" height="7" rx="3" fill="#18181b" /><path d="M23 25h2" stroke="#18181b" {...line} /></>
        : <>{dot(17, mood === "wow" ? 3 : 2.3)}{dot(31, mood === "wow" ? 3 : 2.3)}</>}
      {/* museau */}
      <path d="M22 31h4l-2 2.4z" fill={PINK} />
      {mood === "laugh" ? <path d="M19.5 35h9q-1 6-4.5 6t-4.5-6z" fill="#be123c" />
        : mood === "wow" ? <circle cx="24" cy="37" r="2.2" fill="#be123c" />
        : mood === "sad" ? <><path d="M20 38q4-3.5 8 0" stroke={INK} {...line} strokeWidth={1.8} /><path d="M36 30q-2.3 3 0 5 2.3-2 0-5z" fill="#60a5fa" /></>
        : <path d="M24 33.4q-2 3-4.5 1.2M24 33.4q2 3 4.5 1.2" stroke={c.night ? "#d4d4d8" : INK} {...line} strokeWidth={1.6} />}
      {/* moustaches */}
      <path d="M4 28l8 1.5M4 34l8-1.5M44 28l-8 1.5M44 34l-8-1.5" stroke={c.night ? "#d4d4d8" : "#71717a"} {...line} strokeWidth={1.3} opacity=".7" />
    </svg>
  );
}

/** Chat stable à partir d'un texte (avatar par défaut). */
export function hashCat(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const coat = h % 8;
  const moods = COATS[coat].night ? (["happy", "laugh", "wow"] as const) : (["happy", "laugh", "wow", "cool"] as const);
  return { coat, mood: moods[(h >> 4) % moods.length] };
}
