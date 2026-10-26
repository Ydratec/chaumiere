// Personnages uniques (donnés par l'admin) : deux dessins chacun.
// - UniqueSide : en pied, de profil (tourné vers la droite), repère 40×30, sol en y ≈ 28 : pour la serre et les scènes,
//   avec une démarche propre à chacun quand il marche (.cat-walking : pattes, dandinement, sauts, nage, battements d'ailes).
// - UniqueFace : de face, repère 24×24, pour les avatars (les bulles rondes) : on les reconnaît même tout petits.
// Couleurs fixes : ce sont des personnages, pas des espèces à colorier. Contours légers pour rester lisibles en petit.
import type { Species } from "@/src/modules/characters/catalog";

const INK = "#1f2937";
const LINE = { stroke: "rgba(15,23,42,.28)", strokeWidth: 0.45, strokeLinejoin: "round" as const };
const RAINBOW = ["#f472b6", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#a78bfa"];

/** Où poser un accessoire sur le portrait de face (centre et rayon de la tête, repère 24×24). */
export const FACE_HEAD: Partial<Record<Species, { x: number; y: number; r: number }>> = {
  unicorn: { x: 12, y: 12.6, r: 5.2 },
  penguin: { x: 12, y: 11, r: 7 },
  dragon: { x: 12, y: 11.5, r: 6.5 },
  fox: { x: 12, y: 12.5, r: 6.5 },
  whale: { x: 12, y: 12, r: 7 },
  schrodinger: { x: 12, y: 10.5, r: 6.2 },
  frog: { x: 12, y: 12.4, r: 7.4 },
  shark: { x: 12, y: 12, r: 6.6 },
};

type Leg = (x: number, phase: "a" | "b", c: string, y?: number, len?: number, w?: number) => React.ReactNode;

/**
 * La grenouille assise, de face (dessinée dans un repère 600×600 : tête ronde, gros yeux brillants, joues roses,
 * ventre clair, pattes arrière repliées, doigts terminés par des ventouses). Sert en pied et en portrait.
 */
const FROG = { body: "#7fc045", head: "#84c441", dark: "#6aaa3a", light: "#9dd065", spot: "#72b33c", blush: "#f7b5cf" };
function FrogArt() {
  const toes = (x: number, y: number, dir: 1 | -1, spread: number[][]) =>
    spread.map(([dx, dy]) => (
      <g key={`${dx}${dy}`}>
        <path d={`M${x} ${y}L${x + dir * dx} ${y + dy}`} stroke={FROG.dark} strokeWidth="9" strokeLinecap="round" />
        <circle cx={x + dir * dx} cy={y + dy} r="8" fill={FROG.dark} />
      </g>
    ));
  return <>
    {/* pattes arrière et leurs doigts */}
    {toes(185, 440, -1, [[48, -6], [44, 16], [24, 36]])}
    {toes(415, 440, 1, [[48, -6], [44, 16], [24, 36]])}
    <ellipse cx="205" cy="385" rx="52" ry="62" fill={FROG.dark} />
    <ellipse cx="395" cy="385" rx="52" ry="62" fill={FROG.dark} />
    <path d="M178 372q18 22 44 30M422 372q-18 22-44 30" stroke="#5c9a32" strokeWidth="5" fill="none" strokeLinecap="round" />
    {/* corps et ventre */}
    <ellipse cx="300" cy="372" rx="96" ry="102" fill={FROG.body} />
    <ellipse cx="300" cy="392" rx="54" ry="72" fill={FROG.light} />
    {/* pattes avant et leurs doigts */}
    {toes(250, 452, -1, [[28, 18], [10, 34], [-10, 36]])}
    {toes(350, 452, 1, [[28, 18], [10, 34], [-10, 36]])}
    <path d="M222 318c-8 44-2 98 16 134h24c4-42-2-92-12-134z" fill={FROG.body} />
    <path d="M378 318c8 44 2 98-16 134h-24c-4-42 2-92 12-134z" fill={FROG.body} />
    <path d="M238 360q6 30 10 60M362 360q-6 30-10 60" stroke={FROG.spot} strokeWidth="4" fill="none" strokeLinecap="round" />
    {[[236, 344, 7], [354, 344, 7], [214, 352, 8], [386, 352, 8], [198, 404, 6], [402, 404, 6]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill={FROG.spot} />)}
    {/* tête */}
    <circle cx="205" cy="182" r="62" fill={FROG.head} />
    <circle cx="395" cy="182" r="62" fill={FROG.head} />
    <ellipse cx="300" cy="238" rx="152" ry="94" fill={FROG.head} />
    <path d="M156 262q144 22 288 0-10 46-62 62-40 10-82 10t-82-10c-52-16-62-62-62-62z" fill={FROG.light} />
    <ellipse cx="292" cy="150" rx="18" ry="10" fill={FROG.spot} />
    <circle cx="326" cy="162" r="9" fill={FROG.spot} />
    <circle cx="268" cy="168" r="6" fill={FROG.spot} />
    {/* yeux */}
    {[205, 395].map((x) => (
      <g key={x}>
        <circle cx={x} cy="184" r="45" fill="#fff" />
        <circle cx={x + (x < 300 ? 6 : -6)} cy="188" r="34" fill="#111" />
        <circle cx={x - 6} cy="176" r="11" fill="#fff" />
        <circle cx={x + 12} cy="200" r="5.5" fill="#fff" />
      </g>
    ))}
    {/* joues et sourire */}
    <ellipse cx="190" cy="250" rx="24" ry="15" fill={FROG.blush} />
    <ellipse cx="410" cy="250" rx="24" ry="15" fill={FROG.blush} />
    <path d="M244 236q56 34 112 0" stroke="#1f2937" strokeWidth="6" fill="none" strokeLinecap="round" />
  </>;
}

/** Petit œil brillant (pupille, reflet). */
const Eye = ({ x, y, r = 1.1, iris = INK }: { x: number; y: number; r?: number; iris?: string }) => (
  <>
    <circle cx={x} cy={y} r={r} fill={iris} />
    <circle cx={x + r * 0.35} cy={y - r * 0.35} r={r * 0.32} fill="#fff" />
  </>
);

export function UniqueSide({ species, leg }: { species: Species; leg: Leg }) {
  switch (species) {
    case "unicorn": // blanche, crinière et queue arc-en-ciel, corne dorée torsadée, sabots lavande
      return <>
        {leg(12.5, "b", "#ddd6fe", 20, 7, 2.8)}{leg(23.5, "a", "#ddd6fe", 20, 7, 2.8)}
        <g className="cat-tail">
          {RAINBOW.map((c, i) => (
            <path key={c} d={`M8.4 ${14.6 + i * 0.45}C3.4 ${15.6 + i * 0.9} 2.2 ${20.4 + i * 0.8} 4.6 ${24.6 - i * 0.25}`} stroke={c} strokeWidth="1.25" strokeLinecap="round" fill="none" />
          ))}
        </g>
        <g className="cat-body">
          <ellipse cx="18" cy="17" rx="10.5" ry="5.8" fill="#fdfcff" {...LINE} />
          <ellipse cx="17" cy="19.6" rx="7" ry="2.2" fill="#ede9fe" opacity=".6" />
          <path d="M24 14.2c1-4 2.6-7.2 5.2-8.2l3 5c-2.2 1.2-3.6 3.2-4.2 6z" fill="#fdfcff" {...LINE} />
          <path d="M28.2 5.4c3.2-1.1 6.8 0 8.4 2.8 1.2 2.1.5 3.8-1.8 4-2.1.2-4.6-.4-6.4-1.5z" fill="#fdfcff" {...LINE} />
          <ellipse cx="35.4" cy="10.1" rx="2.1" ry="1.55" fill="#fbcfe8" />
          <circle cx="36.3" cy="9.7" r=".35" fill="#9d174d" />
          {/* corne torsadée et oreille */}
          <path d="M30.6 4.7 34-2.4 32.4 5.1z" fill="#fcd34d" stroke="#b7791f" strokeWidth=".35" strokeLinejoin="round" />
          <path d="M31.1 3.7l2-.6M31.7 2.1l1.7-.5M32.3.5l1-.3" stroke="#b7791f" strokeWidth=".4" strokeLinecap="round" />
          <path d="M29.3 4.9l.5-2.4 1.4 1.7z" fill="#fdfcff" stroke="#c4b5fd" strokeWidth=".35" />
          <path d="M29.6 4.4l.2-1 .6.7z" fill="#fbcfe8" />
          {/* crinière arc-en-ciel le long du cou */}
          {RAINBOW.map((c, i) => (
            <path key={c} d={`M${29.2 - i * 0.9} ${4.4 + i * 0.4}q${-2.4 + i * 0.1} ${3 + i * 0.4} ${-2.7} ${6.4 + i * 0.6}`} stroke={c} strokeWidth="1.25" strokeLinecap="round" fill="none" />
          ))}
          <Eye x={31.9} y={7.3} r={0.95} />
          <path d="M31 6.3l-.6-.6M31.8 6l-.1-.8M32.6 6.3l.4-.6" stroke={INK} strokeWidth=".3" strokeLinecap="round" />
          <circle cx="33.4" cy="9.1" r=".9" fill="#fbcfe8" opacity=".8" />
          <path d="M14.4 15.4l.6 1.2 1.2.3-1 .8.3 1.2-1.1-.6-1.1.6.3-1.2-1-.8 1.2-.3z" fill="#f9a8d4" />
        </g>
        {([[10, "a"], [21, "b"]] as const).map(([x, ph]) => (
          <g key={x} className={`cat-leg cat-leg-${ph}`}>
            <path d={`M${x} 20v6`} stroke="#fdfcff" strokeWidth="2.8" strokeLinecap="round" />
            <path d={`M${x} 26.2v.9`} stroke="#a78bfa" strokeWidth="2.8" strokeLinecap="round" />
          </g>
        ))}
      </>;

    case "penguin": // manchot empereur : il se dandine en marchant
      return <g>
        <path d="M15.6 26.8h4.2" stroke="#f97316" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M20.6 27h4.2" stroke="#fb923c" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M20 2.4c5.4 0 8.2 4.4 8.2 10.8 0 8.2-3.4 13.6-8.2 13.6s-8.6-5-8.6-13.2C11.4 6.8 14.6 2.4 20 2.4z" fill="#1e293b" {...LINE} />
        <path d="M21.2 8.8c3.8.4 5.4 4.2 5.4 8.4 0 5.1-2.5 8.9-5.8 8.9-3.1 0-4.9-3.7-4.9-8.4 0-4.7 1.8-9.3 5.3-8.9z" fill="#f8fafc" />
        <path d="M22.4 8.1c2.6 0 4.2 1.7 4.2 3.6-1.5-.6-3.2-.8-5-.4z" fill="#fbbf24" />
        <path d="M26.7 5.6 31.6 7 26.9 8.6z" fill="#f97316" stroke="#c2410c" strokeWidth=".3" strokeLinejoin="round" />
        <Eye x={24.6} y={5.8} r={0.95} />
        <circle cx="24.6" cy="5.8" r="1.4" fill="none" stroke="#fff" strokeWidth=".35" />
        <ellipse cx="23.8" cy="9.8" rx="1" ry=".6" fill="#fda4af" opacity=".7" />
        <path className="cat-tail" d="M13.1 11.8c-2.7 3-3.7 6.5-3.3 9.6 2.1-1.6 3.5-4.5 3.9-7.8z" fill="#0f172a" />
      </g>;

    case "dragon": // vert émeraude, ailes qui battent, crête, cornes, ventre à écailles, queue en flèche, petite flamme
      return <>
        {leg(12.5, "b", "#15803d", 21, 6, 3)}{leg(23.5, "a", "#15803d", 21, 6, 3)}
        <path className="cat-tail" d="M8.6 18C4 18.5 2 21.6 1.4 25.2l-1.4-.8 1 2.7 2.5-1.2-1.3-.4c.6-2.5 2.5-4.7 6.4-5.1z" fill="#16a34a" {...LINE} />
        <g className="cat-body">
          <g className="wing">
            <path d="M16 13 9.4 1.2l3.2 2.8.8-3.4 2.3 3.7 1.6-2.6 1.4 6.8z" fill="#86efac" stroke="#15803d" strokeWidth=".5" strokeLinejoin="round" />
            <path d="M11.6 4.2l3.7 8M15 2.6l2.2 7.2" stroke="#15803d" strokeWidth=".4" />
          </g>
          <ellipse cx="18" cy="18" rx="10.5" ry="6" fill="#22c55e" {...LINE} />
          <path d="M12 21c4 2.7 9.7 2.7 13.7-.4-1.4 3.5-12.3 3.7-13.7.4z" fill="#fde68a" />
          {[14, 17, 20, 23].map((x) => <path key={x} d={`M${x} 21.6v1.6`} stroke="#d97706" strokeWidth=".35" />)}
          {[10.6, 13.6, 16.6, 19.6].map((x, i) => <path key={x} d={`M${x} ${12.6 - (i % 2) * 0.2}l1.4-2.5 1.4 2.5z`} fill="#f59e0b" />)}
          <path d="M24.5 15c.6-4 2-6.9 4.7-7.7l2.6 4.5c-2 1-3.7 2.9-4.3 5.5z" fill="#22c55e" {...LINE} />
          <path d="M28.4 5.3c3.5-.6 6.9.8 8.3 3.5.8 1.6.2 3-1.6 3.2-2.7.4-5.7-.4-7.5-1.8z" fill="#22c55e" {...LINE} />
          <path d="M29.6 5.3 28 1.4l2.9 3.3zM31.6 4.9 31.2.8l1.9 3.9z" fill="#fef3c7" stroke="#a16207" strokeWidth=".3" />
          <circle cx="35.3" cy="8.6" r=".45" fill="#14532d" />
          <circle cx="31.6" cy="7.6" r="1.2" fill="#fde047" />
          <ellipse cx="31.8" cy="7.6" rx=".35" ry=".95" fill="#111" />
          <path d="M33.4 11.2q1.6.6 3 0" stroke="#14532d" strokeWidth=".45" fill="none" strokeLinecap="round" />
          <path className="flame" d="M37.2 9.4c1.1 0 1.9.4 2.3 1.2-.8.2-1.7 0-2.3-.4z" fill="#fb923c" />
          <circle className="flame" cx="39.5" cy="9.2" r=".7" fill="#fdba74" />
        </g>
        {leg(10, "a", "#16a34a", 21, 6, 3)}{leg(21, "b", "#16a34a", 21, 6, 3)}
      </>;

    case "fox": // roux, museau et poitrail blancs, oreilles noires, chaussettes noires, grande queue au bout blanc
      return <>
        {leg(13, "b", "#c2410c", 20, 7, 2.6)}{leg(24, "a", "#c2410c", 20, 7, 2.6)}
        <g className="cat-tail">
          <path d="M9 15C3 13 .4 17 .9 21.6c.4 3.5 3.5 4.5 5.7 2.4C8.4 22 9.6 18.6 9 15z" fill="#ea580c" {...LINE} />
          <path d="M1.1 21.3c.3 2.9 2.7 4.3 4.9 3.1.2-1.7-.2-3.1-1.2-4.1-1.2-.6-2.7-.2-3.7 1z" fill="#fff7ed" />
        </g>
        <g className="cat-body">
          <ellipse cx="18" cy="17" rx="11" ry="6" fill="#ea580c" {...LINE} />
          <path d="M23.4 12.8c2 4 2 8.6-.5 10.7l-3-1c2-2.6 2.4-6.3 1.4-9.3z" fill="#fff7ed" />
          <path d="M24.2 7.4 25.2.2l4.2 5.2zM30.4 5.4 33.8.4l.4 7z" fill="#ea580c" {...LINE} />
          <path d="M25 1.4l.4 2.6 1.4-.4zM33.4 1.4l-1.2 2.4 1.4.6z" fill="#1f2937" />
          <path d="M25.6 4.4l.4-1.6 1.2 1.6zM32.2 4.6l.8-1.4.2 1.8z" fill="#fed7aa" />
          <circle cx="29.5" cy="11" r="6" fill="#ea580c" {...LINE} />
          <path d="M31 12.2c2.4-.6 5.6.2 7.6 1.4-1.6 2-4.6 3.2-7.8 2.4-1.4-.6-1.6-2.8.2-3.8z" fill="#fff7ed" />
          <path d="M24 13.4c1.2 1.6 3 2.4 5 2.2-1.6 1.8-4 1.8-5.6.4z" fill="#fff7ed" />
          <circle cx="38.6" cy="13.6" r="1.05" fill="#111" />
          <Eye x={31.6} y={9.8} r={1} iris="#78350f" />
          <path d="M30.4 8.6q1.2-.8 2.4 0" stroke="#7c2d12" strokeWidth=".4" fill="none" strokeLinecap="round" />
          <path d="M32.6 15.4q1.6 1 3.2.4" stroke="#7c2d12" strokeWidth=".45" fill="none" strokeLinecap="round" />
        </g>
        {([[10.5, "a"], [22.5, "b"]] as const).map(([x, ph]) => (
          <g key={x} className={`cat-leg cat-leg-${ph}`}>
            <path d={`M${x} 20v5`} stroke="#ea580c" strokeWidth="2.6" strokeLinecap="round" />
            <path d={`M${x} 24.6v2.4`} stroke="#1c1917" strokeWidth="2.6" strokeLinecap="round" />
          </g>
        ))}
      </>;

    case "whale": // baleine bleue qui nage en ondulant, jet d'eau, ventre à sillons
      return <g>
        <path className="cat-tail" d="M7 17.5C4.5 15 2.6 12.4 1 12.6c.4 1.8 1.4 3 2.8 3.8C2 17.6.8 19.4.6 21.4c2-.2 4-1.6 6.6-2.6z" fill="#2563eb" {...LINE} />
        <path d="M6 18c0-6.4 7-10.6 16-10.6 8.6 0 14.4 4.6 14.4 9.6S30 25 21.4 25C12.6 25 6 22.6 6 18z" fill="#3b82f6" {...LINE} />
        <path d="M11 11.6c3-2.4 8-3.2 12-2.8" stroke="#93c5fd" strokeWidth=".9" strokeLinecap="round" fill="none" opacity=".7" />
        <path d="M9 21c4 3 18 3.8 26.4-1.6C33.6 23 28 25 21.4 25 14.6 25 10.4 23.4 9 21z" fill="#dbeafe" />
        {[13, 16, 19, 22, 25, 28].map((x) => <path key={x} d={`M${x} ${22.6 + (x > 24 ? -0.6 : 0)}q1.6.4 3.2.2`} stroke="#93c5fd" strokeWidth=".4" fill="none" />)}
        <path d="M20 21c-1.6 2.4-1.4 4.6.4 5.6.8-1.8.8-3.6.2-5.2z" fill="#1d4ed8" />
        <Eye x={30.6} y={15} r={1.1} iris="#0f172a" />
        <path d="M32.8 18.4q1.8.8 3.4-.6" stroke="#1e3a8a" strokeWidth=".55" fill="none" strokeLinecap="round" />
        <circle cx="32" cy="17" r=".9" fill="#f9a8d4" opacity=".6" />
        <g className="spout">
          <path d="M24.4 7.8c-.4-2 .2-3.6 1.2-4.6M24.4 7.8c-1.4-1.4-3-1.8-4.6-1.4M24.4 7.8c1.2-1.4 3-1.6 4.4-1" stroke="#7dd3fc" strokeWidth=".9" strokeLinecap="round" fill="none" />
          <circle cx="25.8" cy="2.6" r=".7" fill="#bae6fd" />
          <circle cx="19.4" cy="5.8" r=".6" fill="#bae6fd" />
          <circle cx="29" cy="6.4" r=".6" fill="#bae6fd" />
        </g>
      </g>;

    case "schrodinger": // un chat dans une boîte : à moitié là, à moitié pas là ; la boîte avance par petits bonds
      return <g>
        <g className="cat-body">
          <path d="M15.8 9.2 17 4.2l3 3.2zM24 7.2l3-3.2 1.2 5z" fill="#71717a" {...LINE} />
          <path d="M16.6 5.4l.4-.8.9 1z" fill="#f9a8b8" />
          <circle cx="22" cy="10.8" r="6.2" fill="#71717a" {...LINE} />
          <path d="M22 4.6a6.2 6.2 0 0 1 0 12.4" fill="#e4e4e7" opacity=".6" />
          <path d="M22 4.6a6.2 6.2 0 0 1 0 12.4" fill="none" stroke="#a1a1aa" strokeWidth=".5" strokeDasharray="1 .8" />
          <path d="M24.4 7.2l2.4-3 .9 4.4" fill="none" stroke="#a1a1aa" strokeWidth=".45" strokeDasharray=".8 .6" />
          <Eye x={19.6} y={10} r={1.1} iris="#facc15" />
          <circle cx="19.6" cy="10" r=".45" fill="#111" />
          <path d="M23.6 9.1l1.8 1.8M25.4 9.1l-1.8 1.8" stroke="#52525b" strokeWidth=".55" strokeLinecap="round" opacity=".8" />
          <path d="M21.4 12.4l.6.5.6-.5" stroke="#f9a8b8" strokeWidth=".7" fill="none" strokeLinecap="round" />
          <path d="M16 12.4h-3.4M16 13.4l-3.2 1" stroke="#a1a1aa" strokeWidth=".4" strokeLinecap="round" />
          <ellipse cx="17.6" cy="16.6" rx="1.6" ry="1" fill="#71717a" />
          <ellipse cx="26.4" cy="16.6" rx="1.6" ry="1" fill="#d4d4d8" opacity=".6" />
        </g>
        <path d="M10 16.4h24l-1.4 11.2H11.4z" fill="#c8945a" {...LINE} />
        <path d="M10 16.4h24l-.3 2.4H10.3z" fill="#a8743f" />
        <path d="M10 16.4 5.6 13.2 8.4 12zM34 16.4l4.4-3.2-2.8-1.2z" fill="#d9a86e" {...LINE} />
        <rect x="18" y="20" width="8" height="5" rx="1" fill="#fef3c7" />
        <path d="M20.6 21.6c0-1 .7-1.6 1.5-1.6s1.4.6 1.4 1.4c0 1.2-1.4 1.1-1.4 2.1M22.1 24.4v.2" stroke="#92400e" strokeWidth=".7" strokeLinecap="round" fill="none" />
        <path d="M12.4 26.4h19.4" stroke="#8a5a2c" strokeWidth=".5" />
      </g>;

    case "frog": // grenouille assise, de face : elle avance par bonds
      return <g transform="translate(20 1) scale(.0675) translate(-300 -95)"><FrogArt /></g>;

    case "shark": // requin gris-bleu, ventre blanc, aileron, ouïes, grand sourire plein de dents (gentil quand même)
      return <g>
        <path className="cat-tail" d="M7.4 15.6 2.2 8.4c-.4-.6.4-1.2 1-.8l5.6 6.2M7.4 16.4l-3.8 5.4c-.3.6.4 1 .9.7l4.6-4.6" fill="#64748b" stroke="#475569" strokeWidth=".45" strokeLinejoin="round" />
        <path d="M17.2 9.6 19.6 2.4c.3-.8 1.3-.8 1.4.1l1.6 7.4z" fill="#64748b" {...LINE} />
        <path d="M6.8 16c2.4-4.6 9-7 17.6-6.6 6.6.3 11.4 2.8 13.2 5.6.5.8.2 1.6-.6 2-3.2 1.8-8.8 4.2-15.8 4.4C14 21.6 8.6 19.8 6.8 16z" fill="#7c8ea6" {...LINE} />
        <path d="M8.4 17.4c3.4 2.4 8.4 3.6 13.4 3.4 5.6-.2 10.6-1.8 14.4-3.8-1.8 2.6-6.8 5-14.2 5.2-6.6.2-11.6-1.6-13.6-4.8z" fill="#f1f5f9" />
        <path d="M12 12.4c3-1.8 7.4-2.6 11-2.4" stroke="#a5b4c8" strokeWidth=".8" strokeLinecap="round" fill="none" opacity=".8" />
        <path d="M18.4 19.4c-1 2.6-.4 4.6 1.4 5.6.4-2 .8-3.6.4-5.6z" fill="#64748b" stroke="#475569" strokeWidth=".4" strokeLinejoin="round" />
        {[25, 26.4, 27.8].map((x) => <path key={x} d={`M${x} 13.4q-.6 1.8 0 3.4`} stroke="#475569" strokeWidth=".45" fill="none" strokeLinecap="round" />)}
        <circle cx="31.6" cy="13" r="1.25" fill="#fff" />
        <Eye x={31.9} y={13} r={0.8} iris="#0f172a" />
        <path d="M29.6 11.4q1.8-.9 3.4 0" stroke="#334155" strokeWidth=".45" fill="none" strokeLinecap="round" />
        <path d="M28.6 17q4 1.6 8.4-.6-1.6 2.6-4.6 2.6-2.6 0-3.8-2z" fill="#7f1d1d" />
        <path d="M29.4 17.3l.6 1 .5-.8.6 1 .5-.9.6.9.5-1 .6.8.6-1.1.5.6" stroke="#fff" strokeWidth=".55" fill="none" strokeLinejoin="round" />
        <circle cx="34.4" cy="15" r=".8" fill="#f9a8d4" opacity=".55" />
        <g className="spout">
          <circle cx="38.4" cy="10.2" r=".8" fill="none" stroke="#7dd3fc" strokeWidth=".45" />
          <circle cx="39.6" cy="7.4" r=".55" fill="none" stroke="#7dd3fc" strokeWidth=".4" />
        </g>
      </g>;

    default:
      return null;
  }
}

/** Portrait de face (repère 24×24), pour les avatars ronds. */
export function UniqueFace({ species }: { species: Species }) {
  switch (species) {
    case "unicorn":
      return <>
        <rect width="24" height="24" fill="#f5f3ff" />
        <g transform="translate(1.6 3) scale(.87)">
        {RAINBOW.map((c, i) => <path key={c} d={`M${4 + i * 0.6} ${22}C${3 + i} ${14} ${6 + i} ${8} ${10 + i * 0.6} ${5.2}`} stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />)}
        <path d="M7.4 7.6 6.2 3.4l3.6 2.4zM16.6 7.6l1.2-4.2-3.6 2.4z" fill="#fdfcff" {...LINE} />
        <path d="M7.4 7l-.6-2.2 1.8 1.2zM16.6 7l.6-2.2-1.8 1.2z" fill="#fbcfe8" />
        <path d="M12 4c4 0 6.4 3.4 6.4 7.6 0 3-1 5.4-2.6 7.2H8.2C6.6 17 5.6 14.6 5.6 11.6 5.6 7.4 8 4 12 4z" fill="#fdfcff" {...LINE} />
        <ellipse cx="12" cy="17.6" rx="4.6" ry="3.4" fill="#fbcfe8" {...LINE} />
        <circle cx="10.4" cy="17.6" r=".55" fill="#9d174d" /><circle cx="13.6" cy="17.6" r=".55" fill="#9d174d" />
        <path d="M10.6 19.8q1.4.8 2.8 0" stroke="#9d174d" strokeWidth=".45" fill="none" strokeLinecap="round" />
        <path d="M12 6.2 10.6-1.4h2.8z" fill="#fcd34d" stroke="#b7791f" strokeWidth=".35" strokeLinejoin="round" />
        <path d="M11 3.6h2M11.2 1.6h1.6M11.4-.2h1.2" stroke="#b7791f" strokeWidth=".4" strokeLinecap="round" />
        {RAINBOW.slice(0, 4).map((c, i) => <path key={c} d={`M${12 + i * 0.3} 5.4q${2 + i * 0.6} ${1.2} ${2.4 + i * 0.8} ${3.6}`} stroke={c} strokeWidth="1.1" fill="none" strokeLinecap="round" />)}
        <Eye x={9.4} y={11.6} r={1.1} /><Eye x={14.6} y={11.6} r={1.1} />
        <path d="M8.6 10.3l-.6-.6M9.4 10.1v-.8M15.4 10.3l.6-.6M14.6 10.1v-.8" stroke={INK} strokeWidth=".3" strokeLinecap="round" />
        <circle cx="7.6" cy="14" r="1" fill="#fbcfe8" /><circle cx="16.4" cy="14" r="1" fill="#fbcfe8" />
        </g>
      </>;
    case "penguin":
      return <>
        <rect width="24" height="24" fill="#e0f2fe" />
        <path d="M12 3.4c5.4 0 8.6 4 8.6 9.6 0 6-3.6 11-8.6 11s-8.6-5-8.6-11c0-5.6 3.2-9.6 8.6-9.6z" fill="#1e293b" {...LINE} />
        <path d="M12 8.4c1.4-1.6 4.8-1.4 5.6 1.4.8 3-.4 6.8-2 9.4-1 1.6-2.4 2.4-3.6 2.4s-2.6-.8-3.6-2.4c-1.6-2.6-2.8-6.4-2-9.4.8-2.8 4.2-3 5.6-1.4z" fill="#f8fafc" />
        <path d="M5 15c.6 1.8 1.6 3 2.8 3.6-.2-1.6-.8-3-2.8-3.6zM19 15c-.6 1.8-1.6 3-2.8 3.6.2-1.6.8-3 2.8-3.6z" fill="#fbbf24" />
        <Eye x={9.6} y={11.2} r={1.05} /><Eye x={14.4} y={11.2} r={1.05} />
        <path d="M10.4 13.2h3.2L12 16.2z" fill="#f97316" stroke="#c2410c" strokeWidth=".3" strokeLinejoin="round" />
        <circle cx="8" cy="14" r=".9" fill="#fda4af" opacity=".8" /><circle cx="16" cy="14" r=".9" fill="#fda4af" opacity=".8" />
      </>;
    case "dragon":
      return <>
        <rect width="24" height="24" fill="#dcfce7" />
        <path d="M4.2 6 1.6 1.4l4.6 3zM19.8 6l2.6-4.6-4.6 3z" fill="#86efac" stroke="#15803d" strokeWidth=".4" />
        <path d="M8 6.4 6.6 2l2.8 3zM16 6.4 17.4 2l-2.8 3z" fill="#fef3c7" stroke="#a16207" strokeWidth=".3" />
        <path d="M12 4.4c5 0 7.8 3.6 7.8 8 0 2.4-1 4.2-2.4 5.6.6 1.6.2 3.6-1.6 4.4H8.2c-1.8-.8-2.2-2.8-1.6-4.4C5.2 16.6 4.2 14.8 4.2 12.4c0-4.4 2.8-8 7.8-8z" fill="#22c55e" {...LINE} />
        {[[10.4, 4.6], [12, 4.2], [13.6, 4.6]].map(([x, y]) => <path key={x} d={`M${x - 0.8} ${y + 0.4}l.8-1.8.8 1.8z`} fill="#f59e0b" />)}
        <ellipse cx="12" cy="18.6" rx="4.4" ry="3" fill="#4ade80" {...LINE} />
        <circle cx="10.6" cy="18" r=".5" fill="#14532d" /><circle cx="13.4" cy="18" r=".5" fill="#14532d" />
        <path d="M10 20.4q2 1.2 4 0" stroke="#14532d" strokeWidth=".45" fill="none" strokeLinecap="round" />
        <circle cx="9" cy="12" r="1.6" fill="#fde047" /><circle cx="15" cy="12" r="1.6" fill="#fde047" />
        <ellipse cx="9.1" cy="12" rx=".45" ry="1.2" fill="#111" /><ellipse cx="15.1" cy="12" rx=".45" ry="1.2" fill="#111" />
        <path d="M7.2 10.2l2.8.6M16.8 10.2l-2.8.6" stroke="#15803d" strokeWidth=".6" strokeLinecap="round" />
        {[[6.6, 15], [17.4, 15], [7.6, 16.4], [16.4, 16.4]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r=".45" fill="#15803d" />)}
        <path d="M17 21.6c1.2-.4 2.2.2 2.6 1-1 .4-2 .2-2.6-1z" fill="#fb923c" />
      </>;
    case "fox":
      return <>
        <rect width="24" height="24" fill="#ffedd5" />
        <path d="M5 11 4 2.2l6 4.4zM19 11l1-8.8-6 4.4z" fill="#ea580c" {...LINE} />
        <path d="M5.6 9 5 3.8l3.4 2.6zM18.4 9l.6-5.2-3.4 2.6z" fill="#fed7aa" />
        <path d="M4.1 3.4l.4 2.4 1.6-1.4zM19.9 3.4l-.4 2.4-1.6-1.4z" fill="#1f2937" />
        <path d="M12 6c5 0 8.4 3.4 8.4 7.4 0 2.6-1.6 4.8-3.6 6.4L12 23l-4.8-3.2C5.2 18.2 3.6 16 3.6 13.4 3.6 9.4 7 6 12 6z" fill="#ea580c" {...LINE} />
        <path d="M3.8 13.6c1.6.4 4 1.6 5.6 3.6L12 23l-4.8-3.2C5.2 18.2 3.8 16 3.8 13.6zM20.2 13.6c-1.6.4-4 1.6-5.6 3.6L12 23l4.8-3.2c2-1.6 3.4-3.8 3.4-6.2z" fill="#fff7ed" />
        <path d="M9.6 16.4c.8 1.6 1.6 2.6 2.4 2.6s1.6-1 2.4-2.6c-.8.4-1.6.6-2.4.6s-1.6-.2-2.4-.6z" fill="#fff7ed" />
        <ellipse cx="12" cy="19.4" rx="1.2" ry=".9" fill="#111" />
        <Eye x={8.8} y={12.6} r={1.1} iris="#78350f" /><Eye x={15.2} y={12.6} r={1.1} iris="#78350f" />
        <path d="M7.8 11q1-.6 2 0M14.2 11q1-.6 2 0" stroke="#7c2d12" strokeWidth=".4" fill="none" strokeLinecap="round" />
      </>;
    case "whale":
      return <>
        <rect width="24" height="24" fill="#e0f2fe" />
        <g>
          <path d="M12 6.4c-.4-1.8.2-3.2 1.2-4.2M12 6.4c-1.4-1.2-3-1.6-4.4-1.2M12 6.4c1.2-1.2 2.8-1.4 4.2-.8" stroke="#38bdf8" strokeWidth=".9" strokeLinecap="round" fill="none" />
          <circle cx="13.4" cy="1.8" r=".7" fill="#7dd3fc" /><circle cx="7.2" cy="4.6" r=".6" fill="#7dd3fc" /><circle cx="16.8" cy="5" r=".6" fill="#7dd3fc" />
        </g>
        <path d="M12 6.8c6 0 9.6 4.4 9.6 9 0 4.6-4 7.6-9.6 7.6S2.4 20.4 2.4 15.8c0-4.6 3.6-9 9.6-9z" fill="#3b82f6" {...LINE} />
        <path d="M4.4 18.4c2.4 3 12.8 3 15.2 0-1 2.8-4.6 4.6-7.6 4.6s-6.6-1.8-7.6-4.6z" fill="#dbeafe" />
        {[8, 10.6, 13.4, 16].map((x) => <path key={x} d={`M${x} 20.6v1.6`} stroke="#93c5fd" strokeWidth=".4" />)}
        <path d="M7 10c2-1.6 5-2.2 7.6-1.6" stroke="#93c5fd" strokeWidth=".8" strokeLinecap="round" fill="none" opacity=".7" />
        <Eye x={8.4} y={14} r={1.15} iris="#0f172a" /><Eye x={15.6} y={14} r={1.15} iris="#0f172a" />
        <path d="M9.6 17q2.4 1.6 4.8 0" stroke="#1e3a8a" strokeWidth=".55" fill="none" strokeLinecap="round" />
        <circle cx="6.4" cy="16.2" r="1" fill="#f9a8d4" opacity=".7" /><circle cx="17.6" cy="16.2" r="1" fill="#f9a8d4" opacity=".7" />
      </>;
    case "schrodinger":
      return <>
        <rect width="24" height="24" fill="#f4f4f5" />
        <path d="M5.4 8.4 6 2.4l4 3.6zM18.6 8.4 18 2.4l-4 3.6z" fill="#71717a" {...LINE} />
        <path d="M6.4 6.2l.3-2.2 1.6 1.4z" fill="#f9a8b8" />
        <circle cx="12" cy="11" r="7" fill="#71717a" {...LINE} />
        <path d="M12 4a7 7 0 0 1 0 14" fill="#e4e4e7" opacity=".62" />
        <path d="M12 4a7 7 0 0 1 0 14" fill="none" stroke="#a1a1aa" strokeWidth=".5" strokeDasharray="1 .8" />
        <circle cx="9" cy="10.4" r="1.4" fill="#facc15" /><circle cx="9" cy="10.4" r=".6" fill="#111" /><circle cx="9.4" cy="10" r=".3" fill="#fff" />
        <path d="M14.2 9.2l2 2M16.2 9.2l-2 2" stroke="#52525b" strokeWidth=".6" strokeLinecap="round" opacity=".8" />
        <path d="M11.4 13l.6.6.6-.6" stroke="#f9a8b8" strokeWidth=".7" fill="none" strokeLinecap="round" />
        <path d="M6 13.4H2.6M6 14.4l-3.2.8" stroke="#a1a1aa" strokeWidth=".4" strokeLinecap="round" />
        <path d="M1 16.4h22l-1 7.6H2z" fill="#c8945a" {...LINE} />
        <path d="M1 16.4h22v1.8H1z" fill="#a8743f" />
        <rect x="9" y="19" width="6" height="4" rx=".8" fill="#fef3c7" />
        <path d="M11.2 20.4c0-.8.5-1.2 1-1.2s1 .4 1 1c0 .9-1 .8-1 1.6M12.2 22.4v.1" stroke="#92400e" strokeWidth=".55" strokeLinecap="round" fill="none" />
      </>;
    case "frog":
      return <>
        <rect width="24" height="24" fill="#ecfccb" />
        <g transform="translate(12 13.6) scale(.074) translate(-300 -215)"><FrogArt /></g>
      </>;
    case "shark":
      return <>
        <rect width="24" height="24" fill="#e0f2fe" />
        <path d="M12 .8 9.6 6.4h4.8z" fill="#64748b" {...LINE} />
        <path d="M4.2 15.6.6 20.4l5.2-1.6zM19.8 15.6l3.6 4.8-5.2-1.6z" fill="#64748b" {...LINE} />
        <path d="M12 4.8c5.6 0 8.6 4 8.6 8.6 0 5-3.8 9.4-8.6 9.4s-8.6-4.4-8.6-9.4c0-4.6 3-8.6 8.6-8.6z" fill="#7c8ea6" {...LINE} />
        <path d="M4.4 15.4c1.6 4.4 4.4 7.4 7.6 7.4s6-3 7.6-7.4c-2.2 1.2-4.8 1.8-7.6 1.8s-5.4-.6-7.6-1.8z" fill="#f1f5f9" />
        <path d="M7.2 8.4c2.6-1.6 6.6-1.8 9.4-.4" stroke="#a5b4c8" strokeWidth=".8" strokeLinecap="round" fill="none" />
        <circle cx="7.6" cy="12" r="1.4" fill="#fff" /><circle cx="16.4" cy="12" r="1.4" fill="#fff" />
        <Eye x={7.8} y={12.1} r={0.9} iris="#0f172a" /><Eye x={16.2} y={12.1} r={0.9} iris="#0f172a" />
        <path d="M6.2 10.2q1.4-.8 2.8 0M15 10.2q1.4-.8 2.8 0" stroke="#334155" strokeWidth=".45" fill="none" strokeLinecap="round" />
        <path d="M6.8 15.6q5.2 3.4 10.4 0-1.4 3.6-5.2 3.6t-5.2-3.6z" fill="#7f1d1d" />
        <path d="M7.4 16l.8 1.2.8-.9.8 1.2.8-1 .8 1.1.8-1 .8 1.1.8-1 .8 1.1.7-1.2" stroke="#fff" strokeWidth=".6" fill="none" strokeLinejoin="round" />
        <path d="M4.6 12.6v2.4M5.6 12.4v2.6M19.4 12.6v2.4M18.4 12.4v2.6" stroke="#475569" strokeWidth=".4" strokeLinecap="round" />
        <circle cx="5.6" cy="16.6" r=".9" fill="#f9a8d4" opacity=".55" /><circle cx="18.4" cy="16.6" r=".9" fill="#f9a8d4" opacity=".55" />
      </>;
    default:
      return null;
  }
}
