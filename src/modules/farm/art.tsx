// Dessins de la serre : formes simples avec un peu de relief, dans l'esprit des chats de l'app.
// Les objets sont dessinés à leur taille réelle (24 unités par case de la grille).
import type { ItemId } from "./catalog";

const GREEN = "#7cb342";

/** Icône d'un objet de la grange (24×24). */
export function ItemIcon({ id, size = 24 }: { id: ItemId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {ART[id]}
    </svg>
  );
}

const ART: Record<ItemId, React.ReactNode> = {
  coins: (
    <>
      <circle cx="12" cy="12" r="9" fill="#f5c542" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#d9a520" strokeWidth="1.6" />
    </>
  ),
  wheat: (
    <g fill="#e0b44c">
      <path d="M12 22V6" stroke="#c99a2e" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="12" cy="5" rx="1.8" ry="3" />
      {[9, 13, 17].map((y) => (
        <g key={y}>
          <ellipse cx="9.4" cy={y} rx="1.7" ry="2.8" transform={`rotate(-35 9.4 ${y})`} />
          <ellipse cx="14.6" cy={y} rx="1.7" ry="2.8" transform={`rotate(35 14.6 ${y})`} />
        </g>
      ))}
    </g>
  ),
  carrot: (
    <>
      <path d="M12 7c-3 0-4.5 2-4 5l4 10 4-10c.5-3-1-5-4-5z" fill="#f08a3c" />
      <path d="M12 7 10 2M12 7l2-5M12 7l4-3M12 7 8 4" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  corn: (
    <>
      <ellipse cx="12" cy="11" rx="4" ry="8" fill="#f6d44c" />
      <path d="M12 21c-4-1-6-5-6-10 2 2 4 4 6 10zM12 21c4-1 6-5 6-10-2 2-4 4-6 10z" fill={GREEN} />
    </>
  ),
  strawberry: (
    <>
      <path d="M12 21c-5-3-7-7-6-11 1-3 4-3 6-2 2-1 5-1 6 2 1 4-1 8-6 11z" fill="#e5484d" />
      <path d="M8 7l4 2 4-2-2-1-2-2-2 2z" fill={GREEN} />
      {[[10, 12], [14, 12], [12, 15], [9.5, 16], [14.5, 16]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r=".6" fill="#ffe9a8" />
      ))}
    </>
  ),
  flower: (
    <>
      <path d="M12 22v-9" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 18c-2-2-4-2-5-1 1 2 3 2 5 1z" fill={GREEN} />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="6" rx="2.6" ry="3.4" fill="#f472b6" transform={`rotate(${a} 12 9.5)`} />
      ))}
      <circle cx="12" cy="9.5" r="2" fill="#facc15" />
    </>
  ),
  egg: <ellipse cx="12" cy="13" rx="6" ry="8" fill="#f7efe0" stroke="#e2d3b7" strokeWidth="1.2" />,
  bread: (
    <>
      <path d="M4 15c0-5 3.6-8 8-8s8 3 8 8v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="#d99a5b" />
      <path d="M9 10l-1 3M13 9.5l-1 3M17 10.5l-1 3" stroke="#b9773a" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  cake: (
    <>
      <rect x="4" y="11" width="16" height="9" rx="2" fill="#f7d6e0" />
      <path d="M4 14.5h16" stroke="#e8a1b6" strokeWidth="2" />
      <circle cx="12" cy="8.5" r="2.2" fill="#e5484d" />
    </>
  ),
};

/** Jeune pousse, grandit avec `g` (0 → 1), posée en (cx, cy). */
const Sprout = ({ cx, cy, g }: { cx: number; cy: number; g: number }) => (
  <g transform={`translate(${cx} ${cy}) scale(${0.4 + g * 0.6})`}>
    <path d="M0 0V-7" stroke="#5f8f2f" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M0-5c-1-4-5-5-7-4 1 3 4 5 7 4z" fill="#8bc34a" />
    <path d="M0-7c1-4 5-5 7-4-1 3-4 5-7 4z" fill="#7cb342" />
    <path d="M0-5c-1-4-5-5-7-4" stroke="#5f8f2f" strokeWidth=".5" fill="none" />
  </g>
);

const Shadow = ({ cx, cy, rx }: { cx: number; cy: number; rx: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.16} fill="rgba(60,40,20,.22)" />
);

/** Petite fumée qui monte (four en marche). */
const Smoke = ({ x, y }: { x: number; y: number }) => (
  <g opacity=".75">
    <circle cx={x} cy={y} r="3" fill="#e4e4e7" />
    <circle cx={x + 3} cy={y - 5} r="2.4" fill="#ececef" />
    <circle cx={x + 1} cy={y - 9} r="1.8" fill="#f4f4f5" />
  </g>
);

/**
 * Un objet posé, dessiné à sa taille (24 unités par case). `item` : ce qui y pousse/cuit ; `growth` de 0 à 1.
 * Remplit toute sa boîte : à placer dans un conteneur de la taille de son emprise.
 */
export function ObjectArt({ kind, item, growth }: { kind: string; item: ItemId | null; growth: number }) {
  const busy = !!item && growth < 1;
  const svg = (w: number, h: number, children: React.ReactNode) => (
    <svg viewBox={`0 0 ${w} ${h}`} className="size-full overflow-visible" aria-hidden>{children}</svg>
  );
  switch (kind) {
    case "planter": // bac surélevé en bois
      return svg(48, 48, <>
        <Shadow cx={24} cy={46} rx={22} />
        <rect x="2" y="6" width="44" height="40" rx="4" fill="#9c6a3c" />
        <rect x="2" y="6" width="44" height="34" rx="4" fill="#b98250" />
        {[14, 24, 34].map((x) => <path key={x} d={`M${x} 40v6`} stroke="#8a5a30" strokeWidth="1" />)}
        <rect x="5.5" y="9" width="37" height="28" rx="2.5" fill="#5b3e26" />
        <rect x="5.5" y="9" width="37" height="5" rx="2.5" fill="#4a3220" />
        {[[11, 20], [20, 31], [30, 22], [37, 32], [16, 33], [34, 15]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r=".9" fill="#6e4b2e" />)}
        <path d="M2 10a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4" stroke="#d29d68" strokeWidth="1.2" fill="none" />
        {item &&
          [[15, 21], [33, 21], [15, 34], [33, 34]].map(([x, y]) =>
            growth < 1
              ? <Sprout key={`${x}${y}`} cx={x} cy={y + 2} g={growth} />
              : <g key={`${x}${y}`} transform={`translate(${x - 8} ${y - 12}) scale(.68)`}>{ART[item]}</g>,
          )}
      </>);
    case "pot": // pot en terre cuite
      return svg(24, 24, <>
        <Shadow cx={12} cy={22.5} rx={7} />
        <path d="M5.5 12.5h13l-1.8 9.5H7.3z" fill="#cf6f43" />
        <path d="M5.5 12.5h4l.3 9.5H7.3z" fill="#e08a5c" />
        <rect x="4.3" y="10.5" width="15.4" height="3.2" rx="1.3" fill="#b85d35" />
        <rect x="4.3" y="10.5" width="15.4" height="1.2" rx=".6" fill="#d97a4d" />
        <ellipse cx="12" cy="11" rx="6.2" ry="1" fill="#4a3220" />
        {item && (growth < 1 ? <Sprout cx={12} cy={11} g={growth} /> : <g transform="translate(3.5 -5.5) scale(.72)">{ART[item]}</g>)}
      </>);
    case "coop": // clapier-poulailler en bois, une poule à la fenêtre
      return svg(48, 48, <>
        <Shadow cx={24} cy={46} rx={21} />
        <rect x="8" y="40" width="3" height="6" fill="#7a5131" />
        <rect x="37" y="40" width="3" height="6" fill="#7a5131" />
        <rect x="6" y="20" width="36" height="22" rx="2" fill="#c98f5b" />
        {[25, 30, 35].map((y) => <path key={y} d={`M6 ${y}h36`} stroke="#b07a48" strokeWidth=".8" />)}
        <path d="M2 22 24 4l22 18z" fill="#c4473f" />
        <path d="M2 22 24 4l22 18" stroke="#9e3631" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
        {[10, 14, 18].map((y) => <path key={y} d={`M${24 - (y - 4) * 1.2} ${y}h${(y - 4) * 2.4}`} stroke="#ad3d36" strokeWidth=".8" />)}
        <circle cx="24" cy="29" r="6.5" fill="#3d2a1b" />
        <circle cx="24" cy="29" r="6.5" fill="none" stroke="#a46d3d" strokeWidth="1.6" />
        <circle cx="24" cy="30" r="4" fill="#fbf7ee" />
        <path d="M22.5 25.6c.5-1.6 2.5-1.6 3 0z" fill="#e5484d" />
        <circle cx="25.4" cy="29.4" r=".7" fill="#27272a" />
        <path d="M27.5 30.2l2 .6-2 .6z" fill="#f5a623" />
        <path d="M30 46l8-6h4" stroke="#a46d3d" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </>);
    case "oven": // four à pain en briques
      return svg(48, 48, <>
        <Shadow cx={24} cy={46} rx={22} />
        <rect x="31" y="1" width="8" height="16" rx="1.5" fill="#9a9aa1" />
        <rect x="30" y="0" width="10" height="3" rx="1" fill="#7c7c84" />
        {busy && <Smoke x={35} y={-2} />}
        <path d="M3 45V25C3 13 12.5 6 24 6s21 7 21 19v20z" fill="#c4703d" />
        <path d="M3 45V25C3 13 12.5 6 24 6" stroke="#d98b57" strokeWidth="1.6" fill="none" />
        {[[9, 16], [17, 11], [29, 11], [37, 16], [7, 26], [41, 26], [6, 36], [42, 36]].map(([x, y]) => (
          <rect key={`${x}${y}`} x={x - 3} y={y - 1.5} width="6" height="3" rx=".8" fill="#b3612f" />
        ))}
        <path d="M13 45V31a11 11 0 0 1 22 0v14z" fill="#7a3f1d" />
        <path d="M15 45V31.5a9 9 0 0 1 18 0V45z" fill={busy ? "#f59e0b" : "#2f1d11"} />
        {busy && <path d="M19 45c0-5 3-6 3-10 3 3 4 6 4 10zM25 45c0-3 2-4 2-7 2 2 3 4 3 7z" fill="#fde68a" />}
        <rect x="11" y="44" width="26" height="2.4" rx="1" fill="#5f3417" />
      </>);
    case "flowers": // jardinière fleurie
      return svg(24, 24, <>
        <Shadow cx={12} cy={22.5} rx={10} />
        {[[5, 9, "#f472b6"], [10, 6, "#facc15"], [15, 8, "#a78bfa"], [19.5, 6.5, "#f472b6"], [8, 12, "#fb7185"], [17, 12, "#facc15"]].map(([x, y, c]) => (
          <g key={`${x}${y}`}>
            <path d={`M${x} ${y as number + 2}v6`} stroke="#5f8f2f" strokeWidth="1" />
            {[[1.5, 0], [0, 1.5], [-1.5, 0], [0, -1.5]].map(([dx, dy]) => <circle key={`${dx}${dy}`} cx={(x as number) + dx} cy={(y as number) + dy} r="1.3" fill={c as string} />)}
            <circle cx={x as number} cy={y as number} r=".9" fill="#fff7d6" />
          </g>
        ))}
        <path d="M2 15h20l-1.5 7h-17z" fill="#9c6a3c" />
        <rect x="1.5" y="14" width="21" height="2.4" rx="1" fill="#b98250" />
      </>);
    case "tree": // agrume en pot
      return svg(48, 48, <>
        <Shadow cx={24} cy={46} rx={13} />
        <path d="M14 34h20l-2.5 12h-15z" fill="#cf6f43" />
        <path d="M14 34h6l.5 12h-3.5z" fill="#e08a5c" />
        <rect x="12.5" y="31.5" width="23" height="4" rx="1.5" fill="#b85d35" />
        <path d="M24 32V20" stroke="#7a5131" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="24" cy="15" r="14" fill="#4f8a3a" />
        <circle cx="19" cy="11" r="8" fill="#5f9e45" />
        <circle cx="30" cy="17" r="7" fill="#5a9640" />
        {[[16, 16], [27, 9], [31, 21], [21, 22], [24, 14]].map(([x, y]) => (
          <g key={`${x}${y}`}>
            <circle cx={x} cy={y} r="2.4" fill="#f59e0b" />
            <circle cx={x - 0.7} cy={y - 0.7} r=".7" fill="#fde68a" />
          </g>
        ))}
      </>);
    case "fountain": // vasque en pierre
      return svg(48, 48, <>
        <Shadow cx={24} cy={45} rx={21} />
        <ellipse cx="24" cy="36" rx="21" ry="9" fill="#a8a29e" />
        <ellipse cx="24" cy="34" rx="21" ry="9" fill="#c4bfba" />
        <ellipse cx="24" cy="34" rx="17" ry="6.5" fill="#5bb8de" />
        <ellipse cx="20" cy="33" rx="7" ry="2" fill="#a5dcf0" opacity=".8" />
        <rect x="21.5" y="14" width="5" height="20" rx="2" fill="#b5afa9" />
        <ellipse cx="24" cy="14" rx="7" ry="2.6" fill="#c4bfba" />
        <path d="M24 13c-4-6-9-4-11 3M24 13c4-6 9-4 11 3" stroke="#7dd3fc" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="13" cy="20" r="1" fill="#7dd3fc" />
        <circle cx="35" cy="20" r="1" fill="#7dd3fc" />
      </>);
    default:
      return null;
  }
}

/** Petit paquet cadeau (une case). */
export const GiftArt = () => (
  <svg viewBox="0 0 24 24" className="size-full overflow-visible" aria-hidden>
    <ellipse cx="12" cy="22" rx="8" ry="1.4" fill="rgba(60,40,20,.22)" />
    <rect x="4" y="10" width="16" height="11" rx="1.5" fill="#f472b6" />
    <rect x="3" y="7.5" width="18" height="4" rx="1.2" fill="#ec4899" />
    <rect x="10.5" y="7.5" width="3" height="13.5" fill="#fde68a" />
    <path d="M12 7.5c-2-4-6-4-5.5-1.5.4 1.8 3.5 1.5 5.5 1.5zM12 7.5c2-4 6-4 5.5-1.5-.4 1.8-3.5 1.5-5.5 1.5z" fill="#fde68a" stroke="#f59e0b" strokeWidth=".6" />
  </svg>
);
