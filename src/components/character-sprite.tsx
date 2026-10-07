// Personnages vus de profil (tournés vers la droite), dans un repère 40×30, sol en y ≈ 28.
// Animations CSS partagées (.cat-walking, .cat-leg-*, .cat-body, .cat-tail) : voir app/globals.css.
import { COLORS, type Accessory, type Character, type Species } from "@/src/modules/characters/catalog";

const INK = "#27272a";
const PINK = "#f9a8b8";

/** Centre et rayon de la tête de chaque espèce (pour poser les accessoires) + cadrage du portrait. */
const HEAD: Record<Species, { x: number; y: number; r: number; portrait: string }> = {
  cat: { x: 29.5, y: 11, r: 6.2, portrait: "17.5 -1.5 23 23" },
  dog: { x: 29, y: 11, r: 6, portrait: "17 -1.5 23 23" },
  bunny: { x: 28, y: 13, r: 5.5, portrait: "16 -1.5 24 24" },
  duck: { x: 28, y: 10, r: 5, portrait: "16.5 -2 23 23" },
  turtle: { x: 33, y: 18, r: 3.5, portrait: "4 5 34 26" },
  fish: { x: 25, y: 13, r: 5, portrait: "3 1 33 28" },
};

// Pétales précalculés et arrondis : Math.cos ne donne pas forcément le même dernier chiffre côté serveur et navigateur.
const PETALS = [0, 72, 144, 216, 288].map((a) => [+(Math.cos((a * Math.PI) / 180) * 1.4).toFixed(2), +(Math.sin((a * Math.PI) / 180) * 1.4).toFixed(2)]);

function Accessory({ id }: { id: Accessory }) {
  // dessiné pour une tête de rayon 6 centrée en (0, 0), œil vers (2, -1)
  switch (id) {
    case "hat":
      return <>
        <ellipse cx="0" cy="-5.6" rx="5.6" ry="1.2" fill="#27272a" />
        <rect x="-3.3" y="-11.2" width="6.6" height="5.8" rx="1" fill="#27272a" />
        <rect x="-3.3" y="-7.3" width="6.6" height="1.5" fill="#e5484d" />
      </>;
    case "crown":
      return <>
        <path d="M-4.6-5.4v-4.8l2.3 2.4L0-11l2.3 3.2 2.3-2.4v4.8z" fill="#f5c542" stroke="#d9a520" strokeWidth=".5" strokeLinejoin="round" />
        <circle cx="0" cy="-7.4" r=".9" fill="#e5484d" />
      </>;
    case "flower":
      return <g transform="translate(-3 -5.6)">
        {PETALS.map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.25" fill="#f472b6" />)}
        <circle r=".9" fill="#facc15" />
      </g>;
    case "glasses":
      return <>
        <path d="M-2-1.5h2.4" stroke={INK} strokeWidth=".6" />
        <circle cx="2.3" cy="-1.1" r="1.9" fill="rgba(255,255,255,.3)" stroke={INK} strokeWidth=".7" />
      </>;
    case "bow":
      return <>
        <path d="M-2 6l-3.2-2.2v4.4zM-2 6l3.2-2.2v4.4z" fill="#e5484d" />
        <circle cx="-2" cy="6" r=".95" fill="#b91c1c" />
      </>;
    case "scarf":
      return <>
        <path d="M-5.2 3.4Q0 7 5.2 3.4V6Q0 9.6-5.2 6z" fill="#3b82f6" />
        <path d="M-3.4 6.3-5 11.4h2.6l.6-4.6z" fill="#2563eb" />
      </>;
    default:
      return null;
  }
}

function Body({ species, fur, dark, eye }: { species: Species; fur: string; dark: string; eye: string }) {
  const leg = (x: number, phase: "a" | "b", c: string, y = 19, len = 8, w = 3.2) => (
    <path className={`cat-leg cat-leg-${phase}`} d={`M${x} ${y}v${len}`} stroke={c} strokeWidth={w} strokeLinecap="round" />
  );
  switch (species) {
    case "cat":
      return <>
        {leg(13, "b", dark)}{leg(24, "a", dark)}
        <path className="cat-tail" d="M9 16C4 15 3 9 5 4" stroke={fur} strokeWidth="3" strokeLinecap="round" fill="none" />
        <g className="cat-body">
          <ellipse cx="18" cy="17" rx="11" ry="6.3" fill={fur} />
          <path d="M24 7.5 25 1l4 4.2zM30.5 5.2 34 1l.5 6.8z" fill={fur} stroke={fur} strokeWidth="1" strokeLinejoin="round" />
          <path d="M25.6 5 26 2.6l1.6 1.8zM32.2 4.6l1.5-1.7.2 2.6z" fill={PINK} />
          <circle cx="29.5" cy="11" r="6.2" fill={fur} />
          <circle cx="31.6" cy="9.8" r="1.1" fill={eye} />
          <path d="M35.3 11.6l-1.2 1.1-.6-1.3z" fill={PINK} />
          <path d="M33 13.2l5 .3M33 14.3l4.6 1.4" stroke="#a1a1aa" strokeWidth=".5" strokeLinecap="round" />
        </g>
        {leg(10.5, "a", fur)}{leg(22.5, "b", fur)}
      </>;
    case "dog":
      return <>
        {leg(13, "b", dark)}{leg(24, "a", dark)}
        <path className="cat-tail" d="M8 14C5 12 4 8 6 5" stroke={fur} strokeWidth="3.2" strokeLinecap="round" fill="none" />
        <g className="cat-body">
          <ellipse cx="18" cy="17" rx="11" ry="6.3" fill={fur} />
          <circle cx="29" cy="11" r="6" fill={fur} />
          <ellipse cx="34.5" cy="13.2" rx="3.8" ry="2.7" fill={fur} />
          <ellipse cx="34.8" cy="14" rx="3" ry="1.6" fill="#fff" opacity=".35" />
          <circle cx="38" cy="12.2" r="1.3" fill={INK} />
          <circle cx="30.8" cy="9.4" r="1.1" fill={eye} />
          <ellipse cx="25.6" cy="11.5" rx="2.3" ry="4.6" transform="rotate(14 25.6 11.5)" fill={dark} />
          <path d="M34 15.6q1.5 1.2 3 0" stroke={INK} strokeWidth=".6" fill="none" strokeLinecap="round" />
        </g>
        {leg(10.5, "a", fur)}{leg(22.5, "b", fur)}
      </>;
    case "bunny":
      return <>
        <ellipse className="cat-leg cat-leg-b" cx="12.5" cy="26.3" rx="3.6" ry="1.8" fill={dark} />
        <g className="cat-body">
          <circle cx="9.2" cy="17.5" r="2.8" fill="#fff" />
          <ellipse cx="18.5" cy="19" rx="10" ry="7" fill={fur} />
          <ellipse cx="25.6" cy="5.2" rx="1.9" ry="6" transform="rotate(-14 25.6 5.2)" fill={fur} />
          <ellipse cx="29.4" cy="4.8" rx="1.9" ry="6" transform="rotate(12 29.4 4.8)" fill={fur} />
          <ellipse cx="29.4" cy="5.2" rx=".8" ry="4.2" transform="rotate(12 29.4 5.2)" fill={PINK} />
          <circle cx="28" cy="13" r="5.5" fill={fur} />
          <circle cx="29.8" cy="12" r="1.05" fill={eye} />
          <circle cx="33.3" cy="14" r=".8" fill={PINK} />
        </g>
        <ellipse className="cat-leg cat-leg-a" cx="24" cy="26.6" rx="2.4" ry="1.4" fill={fur} />
      </>;
    case "duck":
      return <>
        <path className="cat-leg cat-leg-b" d="M15 23v4.5h3" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <g className="cat-body">
          <path d="M8 17l-4-5 6 2z" fill={dark} />
          <ellipse cx="18" cy="18" rx="10.5" ry="7" fill={fur} />
          <ellipse cx="16" cy="17" rx="6" ry="3.6" fill={dark} opacity=".55" />
          <circle cx="28" cy="10" r="5" fill={fur} />
          <path d="M32 9.6 37.6 11 32 12.6z" fill="#f59e0b" />
          <circle cx="29.6" cy="8.8" r="1" fill={eye} />
        </g>
        <path className="cat-leg cat-leg-a" d="M20 23.5v4h3" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>;
    case "turtle":
      return <>
        {leg(11, "b", "#86a865", 21, 5, 3.4)}{leg(25, "a", "#86a865", 21, 5, 3.4)}
        <g className="cat-body">
          <path d="M5.5 21.5 3 23" stroke="#a3c47a" strokeWidth="2" strokeLinecap="round" />
          <path d="M30 20q2-3.5 4.6-2.5" stroke="#a3c47a" strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <circle cx="33" cy="18" r="3.5" fill="#a3c47a" />
          <circle cx="34.3" cy="17.2" r=".8" fill={INK} />
          <path d="M6 22a12.5 11.5 0 0 1 25 0z" fill={fur} />
          <path d="M11 22l3-6h9l3 6M14 16l4.5-4 4.5 4M18.5 12v-2" stroke={dark} strokeWidth="1" fill="none" strokeLinejoin="round" />
          <rect x="5" y="21" width="27" height="2.4" rx="1.2" fill={dark} />
        </g>
        {leg(14, "a", "#a3c47a", 21, 5, 3.4)}{leg(28, "b", "#a3c47a", 21, 5, 3.4)}
      </>;
    case "fish":
      return <g className="cat-body">
        <path className="cat-tail" d="M10 15 3 9.5v11z" fill={dark} />
        <path d="M14 9.5q5-6 11-1z" fill={dark} />
        <ellipse cx="19" cy="15" rx="10.5" ry="6.6" fill={fur} />
        <path d="M22 9.4q-3 5.6 0 11.2" stroke={dark} strokeWidth=".9" fill="none" opacity=".7" />
        <path d="M17 18q2 3 4 1z" fill={dark} />
        <circle cx="25.4" cy="13.2" r="1.3" fill="#fff" />
        <circle cx="25.8" cy="13.2" r=".7" fill={INK} />
        <path d="M28.6 16.4q.8.6 1.5 0" stroke={INK} strokeWidth=".6" fill="none" strokeLinecap="round" />
        <circle cx="33" cy="9" r=".9" fill="none" stroke="#7dd3fc" strokeWidth=".5" />
        <circle cx="34.5" cy="5.5" r="1.3" fill="none" stroke="#7dd3fc" strokeWidth=".5" />
      </g>;
  }
}

/**
 * Le personnage en pied (`portrait` : cadré sur la tête, pour les avatars).
 * `walking` : animation de marche.
 */
export function CharacterSprite({ character, walking = false, portrait = false, size = 48 }: {
  character: Character;
  walking?: boolean;
  portrait?: boolean;
  size?: number;
}) {
  const color = COLORS[character.color] ?? COLORS[0];
  const eye = "night" in color && color.night ? "#fef3c7" : INK;
  const h = HEAD[character.species];
  return (
    <svg
      width={size}
      height={portrait ? size : size * 0.75}
      viewBox={portrait ? h.portrait : "0 0 40 30"}
      className={`${portrait ? "overflow-hidden" : "overflow-visible"} ${walking ? "cat-walking" : ""}`}
      aria-hidden
    >
      {!portrait && <ellipse cx="19" cy="28.4" rx={character.species === "fish" ? 8 : 13} ry="1.5" fill="rgba(0,0,0,.16)" />}
      <Body species={character.species} fur={color.fur} dark={color.dark} eye={eye} />
      {character.accessory && (
        <g className="cat-body">
          <g transform={`translate(${h.x} ${h.y}) scale(${h.r / 6})`}>
            <Accessory id={character.accessory} />
          </g>
        </g>
      )}
    </svg>
  );
}
