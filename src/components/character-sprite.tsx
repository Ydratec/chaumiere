// Personnages vus de profil (tournés vers la droite), dans un repère 40×30, sol en y ≈ 28.
// Animations CSS partagées (.cat-walking, .cat-leg-*, .cat-body, .cat-tail) : voir app/globals.css.
import { COLORS, UNIQUE_SPECIES, type Accessory, type Character, type Species } from "@/src/modules/characters/catalog";

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
  unicorn: { x: 30.5, y: 8, r: 5, portrait: "18 -4 22 22" },
  penguin: { x: 20, y: 6.5, r: 5.5, portrait: "9 -4 22 22" },
  dragon: { x: 31, y: 8.5, r: 5, portrait: "19 -3.5 22 22" },
  fox: { x: 29.5, y: 11, r: 5.8, portrait: "18 -1.5 23 23" },
  whale: { x: 27, y: 9.5, r: 5, portrait: "13 -2 26 26" },
  schrodinger: { x: 22, y: 7.5, r: 5.4, portrait: "10.5 -3 23 23" },
  frog: { x: 23, y: 12, r: 6, portrait: "10 -1 26 26" },
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
    case "witch":
      return <>
        <path d="M-3.8-5.8 1.6-15.6q.9-.7 1.1.4l1.6 9.4z" fill="#4c1d95" />
        <path d="M-3.4-7.6h7.6l.3 1.8h-8.3z" fill="#f59e0b" />
        <ellipse cx="0" cy="-5.6" rx="6.8" ry="1.4" fill="#3b0f7a" />
      </>;
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


/** Personnages uniques : couleurs fixes et détails propres (on les reconnaît au premier coup d'œil). */
function Unique({ species, eye, leg }: { species: Species; eye: string; leg: (x: number, phase: "a" | "b", c: string, y?: number, len?: number, w?: number) => React.ReactNode }) {
  switch (species) {
    case "unicorn": { // blanche, crinière et queue arc-en-ciel, corne dorée torsadée, sabots lavande
      const RAINBOW = ["#f472b6", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#a78bfa"];
      return <>
        {leg(12, "b", "#e9e3f5", 20, 7, 3)}{leg(23, "a", "#e9e3f5", 20, 7, 3)}
        <path d="M10.5 27.2h3M21.5 27.2h3" stroke="#c4b5fd" strokeWidth="1.6" strokeLinecap="round" />
        {RAINBOW.map((c, i) => (
          <path key={c} className="cat-tail" d={`M8 ${15 + i * 0.5}C3 ${16 + i} 2 ${21 + i} 4.5 ${25 - i * 0.3}`} stroke={c} strokeWidth="1.3" strokeLinecap="round" fill="none" />
        ))}
        <g className="cat-body">
          <ellipse cx="18" cy="17" rx="10.5" ry="5.8" fill="#fbfaff" />
          <path d="M24 14c1-4 2.5-7 5-8l3 5c-2 1-3.5 3-4 6z" fill="#fbfaff" />
          <path d="M28 5.5c3-1 6.5 0 8 2.6 1.2 2 .6 3.6-1.6 3.8-2 .2-4.4-.4-6.2-1.4z" fill="#fbfaff" />
          <ellipse cx="35.2" cy="10" rx="2" ry="1.5" fill="#f5d0e6" />
          <circle cx="36" cy="9.6" r=".35" fill="#a16207" />
          <path d="M30.5 4.6 33.8-2.2 32.2 5z" fill="#facc15" stroke="#d4a017" strokeWidth=".35" strokeLinejoin="round" />
          <path d="M31 3.6l2-.6M31.6 2l1.6-.5M32.2.4l1-.3" stroke="#b7791f" strokeWidth=".4" strokeLinecap="round" />
          <path d="M29.4 4.8l.6-2.2 1.2 1.6z" fill="#fbfaff" stroke="#ddd6fe" strokeWidth=".3" />
          {RAINBOW.map((c, i) => (
            <path key={c} d={`M${29 - i * 0.9} ${4.6 + i * 0.4}q${-2.4 + i * 0.1} ${3 + i * 0.4} ${-2.6} ${6.2 + i * 0.6}`} stroke={c} strokeWidth="1.2" strokeLinecap="round" fill="none" />
          ))}
          <circle cx="31.8" cy="7.2" r=".95" fill={eye} />
          <path d="M31 6.3l-.6-.6M31.8 6l-.1-.8M32.6 6.3l.4-.6" stroke={INK} strokeWidth=".3" strokeLinecap="round" />
          <circle cx="33.3" cy="9" r=".9" fill="#fbcfe8" opacity=".8" />
          <path d="M14 15.5l.6 1.2 1.2.3-1 .8.3 1.2-1.1-.6-1.1.6.3-1.2-1-.8 1.2-.3z" fill="#f9a8d4" opacity=".7" />
        </g>
        {leg(10, "a", "#fbfaff", 20, 7, 3)}{leg(21, "b", "#fbfaff", 20, 7, 3)}
      </>;
    }
    case "penguin": // manchot empereur : dos noir, ventre blanc, tache jaune au cou, bec orange, petites ailes
      return <>
        <path className="cat-leg cat-leg-b" d="M16.5 26.6h3.6" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" />
        <g className="cat-body">
          <path d="M20 2.5c5.2 0 8 4.2 8 10.5 0 8-3.4 13.5-8 13.5s-8.5-5-8.5-13C11.5 6.8 14.6 2.5 20 2.5z" fill="#1f2937" />
          <path d="M21.2 9c3.6.4 5.2 4 5.2 8.2 0 5-2.4 8.8-5.6 8.8-3 0-4.8-3.6-4.8-8.2 0-4.6 1.8-9.2 5.2-8.8z" fill="#f8fafc" />
          <path d="M22.4 8.2c2.4 0 4 1.6 4 3.4-1.4-.6-3-.8-4.8-.4z" fill="#fcd34d" />
          <path d="M26.6 5.8 31.4 7.2 26.8 8.6z" fill="#f97316" />
          <path d="M26.8 7.2h3.4" stroke="#c2410c" strokeWidth=".35" />
          <circle cx="24.6" cy="5.8" r="1.25" fill="#fff" />
          <circle cx="25" cy="5.8" r=".7" fill="#111" />
          <circle cx="25.2" cy="5.5" r=".25" fill="#fff" />
          <path className="cat-tail" d="M13.2 12c-2.6 3-3.6 6.4-3.2 9.4 2-1.6 3.4-4.4 3.8-7.6z" fill="#111827" />
          <ellipse cx="23.8" cy="9.6" rx="1" ry=".6" fill="#fda4af" opacity=".7" />
        </g>
        <path className="cat-leg cat-leg-a" d="M21 26.8h3.6" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round" />
      </>;
    case "dragon": // vert émeraude, ailes de chauve-souris, crête, cornes, ventre doré à écailles, queue en flèche
      return <>
        {leg(12, "b", "#15803d", 21, 6, 3.2)}{leg(23, "a", "#15803d", 21, 6, 3.2)}
        <path className="cat-tail" d="M8.5 18C4 18.5 2 21.5 1.5 25l-1.4-.8 1 2.6 2.4-1.2-1.3-.4c.6-2.4 2.4-4.6 6.3-5z" fill="#16a34a" />
        <g className="cat-body">
          <path d="M16 13 9.5 1.5 12.6 4.2 13.4.8 15.6 4.4 17.2 1.8 18.6 8.4z" fill="#86efac" stroke="#15803d" strokeWidth=".5" strokeLinejoin="round" />
          <path d="M11.6 4.4l3.6 7.8M15 2.8l2.2 7" stroke="#15803d" strokeWidth=".4" />
          <ellipse cx="18" cy="18" rx="10.5" ry="6" fill="#22c55e" />
          <path d="M12 21c4 2.6 9.6 2.6 13.6-.4-1.4 3.4-12.2 3.6-13.6.4z" fill="#fde68a" />
          {[14, 17, 20, 23].map((x) => <path key={x} d={`M${x} 21.6v1.6`} stroke="#d97706" strokeWidth=".35" />)}
          {[11, 14, 17, 20].map((x, i) => <path key={x} d={`M${x} ${12.6 - (i % 2) * 0.2}l1.4-2.4 1.4 2.4z`} fill="#f59e0b" />)}
          <path d="M24.5 15c.6-4 2-6.8 4.6-7.6l2.6 4.4c-2 1-3.6 2.8-4.2 5.4z" fill="#22c55e" />
          <path d="M28.4 5.4c3.4-.6 6.8.8 8.2 3.4.8 1.6.2 3-1.6 3.2-2.6.4-5.6-.4-7.4-1.8z" fill="#22c55e" />
          <path d="M29.6 5.4 28 1.6l2.8 3.2zM31.6 5 31.2 1l1.8 3.8z" fill="#fef3c7" stroke="#a16207" strokeWidth=".3" />
          <circle cx="35.2" cy="8.6" r=".45" fill="#14532d" />
          <circle cx="31.6" cy="7.6" r="1.15" fill="#fef08a" />
          <ellipse cx="31.8" cy="7.6" rx=".35" ry=".9" fill="#111" />
          <path d="M33.4 11.2q1.6.6 3 0" stroke="#14532d" strokeWidth=".45" fill="none" strokeLinecap="round" />
          <path d="M37.2 9.4c1 0 1.8.4 2.2 1.2-.8.2-1.6 0-2.2-.4z" fill="#fb923c" opacity=".9" />
          <circle cx="39.4" cy="9.2" r=".7" fill="#fdba74" opacity=".8" />
        </g>
        {leg(10, "a", "#16a34a", 21, 6, 3.2)}{leg(21, "b", "#16a34a", 21, 6, 3.2)}
      </>;
    case "fox": // roux, museau et poitrail blancs, oreilles et chaussettes noires, grande queue touffue au bout blanc
      return <>
        {leg(13, "b", "#292524", 20, 7, 2.6)}{leg(24, "a", "#292524", 20, 7, 2.6)}
        <g className="cat-tail">
          <path d="M9 15C3 13 .5 17 1 21.5c.4 3.4 3.4 4.4 5.6 2.4C8.4 22 9.6 18.6 9 15z" fill="#ea580c" />
          <path d="M1.2 21.2c.3 2.8 2.6 4.2 4.8 3 .2-1.6-.2-3-1.2-4-1.2-.6-2.6-.2-3.6 1z" fill="#fff7ed" />
        </g>
        <g className="cat-body">
          <ellipse cx="18" cy="17" rx="11" ry="6" fill="#ea580c" />
          <path d="M23.5 13c2 4 2 8.5-.5 10.5l-3-1c2-2.6 2.4-6.2 1.4-9.2z" fill="#fff7ed" />
          <path d="M24.2 7.4 25.2 .2l4.2 5.2zM30.4 5.4 33.8.4l.4 7z" fill="#ea580c" />
          <path d="M25 1.4l.4 2.6 1.4-.4zM33.4 1.4l-1.2 2.4 1.4.6z" fill="#1f2937" />
          <circle cx="29.5" cy="11" r="6" fill="#ea580c" />
          <path d="M31 12.2c2.4-.6 5.6.2 7.6 1.4-1.6 2-4.6 3.2-7.8 2.4-1.4-.6-1.6-2.8.2-3.8z" fill="#fff7ed" />
          <path d="M24 13.4c1.2 1.6 3 2.4 5 2.2-1.6 1.8-4 1.8-5.6.4z" fill="#fff7ed" />
          <circle cx="38.6" cy="13.6" r="1" fill="#111" />
          <path d="M30.6 9.6q1.2-1 2.4 0" stroke="#111" strokeWidth=".9" fill="none" strokeLinecap="round" />
          <path d="M32.6 15.4q1.6 1 3.2.4" stroke="#7c2d12" strokeWidth=".45" fill="none" strokeLinecap="round" />
        </g>
        {leg(10.5, "a", "#1c1917", 20, 7, 2.6)}{leg(22.5, "b", "#1c1917", 20, 7, 2.6)}
      </>;
    case "whale": // baleine bleue : ventre clair à sillons, nageoire caudale, jet d'eau, nageoire pectorale
      return <g className="cat-body">
        <path className="cat-tail" d="M7 17.5C4.5 15 2.6 12.4 1 12.6c.4 1.8 1.4 3 2.8 3.8C2 17.6.8 19.4.6 21.4c2-.2 4-1.6 6.6-2.6z" fill="#2563eb" />
        <path d="M6 18c0-6.4 7-10.6 16-10.6 8.6 0 14.4 4.6 14.4 9.6S30 25 21.4 25C12.6 25 6 22.6 6 18z" fill="#3b82f6" />
        <path d="M9 21c4 3 18 3.8 26.4-1.6C33.6 23 28 25 21.4 25 14.6 25 10.4 23.4 9 21z" fill="#dbeafe" />
        {[13, 16, 19, 22, 25, 28].map((x) => <path key={x} d={`M${x} ${22.6 + (x > 24 ? -0.6 : 0)}q1.6.4 3.2.2`} stroke="#93c5fd" strokeWidth=".4" fill="none" />)}
        <path d="M20 21c-1.6 2.4-1.4 4.6.4 5.6.8-1.8.8-3.6.2-5.2z" fill="#1d4ed8" />
        <circle cx="30.6" cy="15" r="1.1" fill="#0f172a" />
        <circle cx="30.9" cy="14.7" r=".35" fill="#fff" />
        <path d="M32.8 18.4q1.8.8 3.4-.6" stroke="#1e3a8a" strokeWidth=".55" fill="none" strokeLinecap="round" />
        <circle cx="32" cy="17" r=".9" fill="#f9a8d4" opacity=".6" />
        <path d="M24.4 7.8c-.4-2 .2-3.6 1.2-4.6M24.4 7.8c-1.4-1.4-3-1.8-4.6-1.4M24.4 7.8c1.2-1.4 3-1.6 4.4-1" stroke="#7dd3fc" strokeWidth=".9" strokeLinecap="round" fill="none" />
        <circle cx="25.8" cy="2.6" r=".7" fill="#bae6fd" />
        <circle cx="19.4" cy="5.8" r=".6" fill="#bae6fd" />
        <circle cx="29" cy="6.4" r=".6" fill="#bae6fd" />
      </g>;
    case "schrodinger": // un chat dans une boîte en carton : à moitié là (œil ouvert), à moitié pas là (œil en croix, transparent)
      return <>
        <g className="cat-body">
          <path d="M15.8 9.2 17 4.2l3 3.2zM24 7.2l3-3.2 1.2 5z" fill="#71717a" />
          <circle cx="22" cy="10.8" r="6.2" fill="#71717a" />
          {/* moitié « pas là » : en pointillé, à demi effacée */}
          <path d="M22 4.6a6.2 6.2 0 0 1 0 12.4" fill="#e4e4e7" opacity=".55" />
          <path d="M22 4.6a6.2 6.2 0 0 1 0 12.4" fill="none" stroke="#a1a1aa" strokeWidth=".5" strokeDasharray="1 .8" />
          <circle cx="19.6" cy="10" r="1.1" fill={eye} />
          <path d="M23.6 9.1l1.8 1.8M25.4 9.1l-1.8 1.8" stroke="#52525b" strokeWidth=".55" strokeLinecap="round" opacity=".8" />
          <path d="M21.4 12.4l.6.5.6-.5" stroke="#f9a8b8" strokeWidth=".7" fill="none" strokeLinecap="round" />
          <path d="M16 12.4h-3.4M16 13.4l-3.2 1" stroke="#a1a1aa" strokeWidth=".4" strokeLinecap="round" />
          <ellipse cx="17.6" cy="16.6" rx="1.6" ry="1" fill="#71717a" />
          <ellipse cx="26.4" cy="16.6" rx="1.6" ry="1" fill="#d4d4d8" opacity=".6" />
        </g>
        {/* la boîte (ne bouge pas) : rabats ouverts, étiquette « ? » */}
        <path d="M10 16.4h24l-1.4 11.2H11.4z" fill="#c8945a" />
        <path d="M10 16.4h24l-.3 2.4H10.3z" fill="#a8743f" />
        <path d="M10 16.4 5.6 13.2 8.4 12zM34 16.4l4.4-3.2-2.8-1.2z" fill="#d9a86e" />
        <rect x="18" y="20" width="8" height="5" rx="1" fill="#fef3c7" />
        <text x="22" y="24.2" textAnchor="middle" fontSize="4.6" fontWeight="700" fill="#92400e" fontFamily="system-ui, sans-serif">?</text>
        <path d="M12.4 26.4h19.4" stroke="#8a5a2c" strokeWidth=".5" />
      </>;
    case "frog": // grenouille verte : grands yeux sur le dessus, grand sourire, joues roses, taches, pattes palmées
      return <>
        <g className="cat-leg cat-leg-b"><path d="M8 24.6c-1.6 1.6-.6 3 1.6 2.8l4.6-.2" stroke="#16a34a" strokeWidth="2.6" strokeLinecap="round" fill="none" /></g>
        <g className="cat-body">
          <path d="M9 22.4C9 15.8 14.6 11.4 23 11.4s14 4.4 14 11c0 3.6-3.4 5-14 5S9 26 9 22.4z" fill="#4ade80" />
          <path d="M14 24.4c3 2 15 2 18 0-1.2 2.4-5.6 3-9 3s-7.8-.6-9-3z" fill="#bbf7d0" />
          <circle cx="17.6" cy="11.6" r="4" fill="#4ade80" />
          <circle cx="28.4" cy="11.6" r="4" fill="#4ade80" />
          <circle cx="17.8" cy="11.2" r="2.6" fill="#fff" />
          <circle cx="28.6" cy="11.2" r="2.6" fill="#fff" />
          <circle cx="18.6" cy="11.2" r="1.35" fill="#111" />
          <circle cx="29.4" cy="11.2" r="1.35" fill="#111" />
          <circle cx="19" cy="10.7" r=".45" fill="#fff" />
          <circle cx="29.8" cy="10.7" r=".45" fill="#fff" />
          <path d="M17.6 19c2.6 2.6 7.8 3 11.4.4" stroke="#14532d" strokeWidth=".8" fill="none" strokeLinecap="round" />
          <circle cx="15.6" cy="18.4" r="1.4" fill="#f9a8b8" opacity=".85" />
          <circle cx="31.6" cy="18" r="1.4" fill="#f9a8b8" opacity=".85" />
          {[[12.6, 17], [34.4, 21.2], [11.6, 21.8], [26, 14.8]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r=".9" fill="#22c55e" />)}
          <circle cx="22.4" cy="16.6" r=".35" fill="#14532d" /><circle cx="24" cy="16.6" r=".35" fill="#14532d" />
        </g>
        <g className="cat-leg cat-leg-a"><path d="M30 26.6l4.6.2 1.2-1 .4 1.4 1.2-.6" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></g>
      </>;
    default:
      return null;
  }
}

function Body({ species, fur, dark, eye }: { species: Species; fur: string; dark: string; eye: string }) {
  const leg = (x: number, phase: "a" | "b", c: string, y = 19, len = 8, w = 3.2) => (
    <path className={`cat-leg cat-leg-${phase}`} d={`M${x} ${y}v${len}`} stroke={c} strokeWidth={w} strokeLinecap="round" />
  );
  if (UNIQUE_SPECIES.includes(species)) return <Unique species={species} eye={INK} leg={leg} />;
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
      {!portrait && <ellipse cx="19" cy="28.4" rx={character.species === "fish" || character.species === "whale" ? 8 : character.species === "penguin" ? 7 : 13} ry="1.5" fill="rgba(0,0,0,.16)" />}
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
