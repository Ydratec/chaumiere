// Têtes de face (repère 24×24) de tous les personnages, pour les avatars ronds : style mignon commun
// (grands yeux bas et écartés avec reflets, petite bouche, volume par une ombre en bas à droite), mais
// lumière et joues propres à chaque animal (fourrure mate, peau mouillée brillante, plumes, écailles…).
// Dessins en chaîne SVG (statiques, aucune donnée utilisateur) ; les clipPath portent un préfixe unique par avatar.
import type { Species } from "@/src/modules/characters/catalog";

type Tone = { fur: string; dark: string; light: string; sh: string; n: boolean };

const INK = "#2b2730", PK = "#ffb3c4";
function mix(a: string, b: string, t: number) {
  const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
let PFX = "", UID = 0;
type SOpts = { dx?: number; dy?: number; in?: string };
/** Forme avec volume : la forme en teinte d'ombre, recouverte par elle-même décalée vers le haut-gauche. */
function S(d: string, fill: string, shade: string, o: SOpts = {}) {
  const id = `${PFX}f${++UID}`, dx = o.dx ?? -0.45, dy = o.dy ?? -0.75;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})"><path d="${d}" fill="${shade}"/><path d="${d}" fill="${fill}" transform="translate(${dx} ${dy})"/>${o.in || ""}</g>`;
}
function eye(x: number, y: number, s = 1, night = false) {
  return `${night ? `<ellipse cx="${x}" cy="${y}" rx="${1.25 * s}" ry="${1.45 * s}" fill="#fff" opacity=".5"/>` : ""}<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${1.2 * s}" fill="${INK}"/><ellipse cx="${x}" cy="${y + 0.55 * s}" rx="${0.6 * s}" ry="${0.4 * s}" fill="#5a4f66" opacity=".7"/><circle cx="${x + 0.32 * s}" cy="${y - 0.45 * s}" r="${0.42 * s}" fill="#fff"/><circle cx="${x - 0.35 * s}" cy="${y + 0.45 * s}" r="${0.17 * s}" fill="#fff"/>`;
}
const eyes = (y: number, dx = 3.3, s = 1, n = false) => eye(12 - dx, y, s, n) + eye(12 + dx, y, s, n);
const mouthW = (y: number, c = INK) => `<path d="M10.8 ${y}q.6.7 1.2 0q.6.7 1.2 0" stroke="${c}" stroke-width=".45" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const smile = (y: number, w = 1.2, c = INK) => `<path d="M${12 - w} ${y}q${w} ${w * 0.8} ${2 * w} 0" stroke="${c}" stroke-width=".45" fill="none" stroke-linecap="round"/>`;
const heart = (x: number, y: number, s: number, c: string) => `<path d="M${x} ${y + 0.7 * s}C${x - 1.2 * s} ${y - 0.1 * s} ${x - 0.9 * s} ${y - 0.9 * s} ${x} ${y - 0.4 * s}C${x + 0.9 * s} ${y - 0.9 * s} ${x + 1.2 * s} ${y - 0.1 * s} ${x} ${y + 0.7 * s}Z" fill="${c}"/>`;
// Lumières : fourrure mate (douce, large), peau mouillée (reflet net + point), plumes et écailles (liseré en arc).
const matte = (cx: number, cy: number, rx: number, ry: number, r = -20, o = 0.2) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 1.5}" ry="${ry * 1.6}" transform="rotate(${r} ${cx} ${cy})" fill="#fff" opacity="${o * 0.4}"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${cx} ${cy})" fill="#fff" opacity="${o}"/>`;
const gloss = (cx: number, cy: number, rx: number, ry: number, r = -25, o = 0.6) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${cx} ${cy})" fill="#fff" opacity="${o}"/><circle cx="${cx + rx * 1.25}" cy="${cy + ry * 0.9}" r="${ry * 0.38}" fill="#fff" opacity="${o + 0.2}"/>`;
const rim = (d: string, o = 0.45, w = 0.6) => `<path d="${d}" stroke="#fff" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${o}"/>`;
// Joues : ovale ou rond (couleur et intensité par espèce), éclats, ou hachures « /// ».
const bOval = (y: number, dx: number, c: string, o: number, rx = 1.35, ry = 0.8) => [-1, 1].map((k) => `<ellipse cx="${12 + k * dx}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${o}"/>`).join("");
const bSpark = (y: number, dx: number) => [-1, 1].map((k) => `<path d="M${12 + k * dx - 0.5} ${y - 0.1}l.3-.4M${12 + k * dx + 0.1} ${y - 0.1}l.3-.4" stroke="#fff" stroke-width=".22" stroke-linecap="round" opacity=".75"/>`).join("");
const bHatch = (y: number, dx: number, c: string, o = 0.8) => [-1, 1].map((k) => [-0.6, 0, 0.6].map((e) => `<path d="M${12 + k * dx + e - 0.25} ${y + 0.35}l.5-.7" stroke="${c}" stroke-width=".3" stroke-linecap="round" opacity="${o}"/>`).join("")).join("");

const CAT_HEAD='M12 6.4C16.8 6.4 19.9 9.2 20.1 13.1 20.2 14.3 21 14.8 20.9 15.5 20.3 15.6 20.1 15.9 19.9 16.4 19 19.3 15.9 20.9 12 20.9S5 19.3 4.1 16.4C3.9 15.9 3.7 15.6 3.1 15.5 3 14.8 3.8 14.3 3.9 13.1 4.1 9.2 7.2 6.4 12 6.4Z';

const FACE: Record<Species, (t: Tone) => string> = {
  cat: (t) => `
${S('M4.3 11.4 4.4 4.3C4.5 3.2 5.3 3 6 3.6L10.4 7.2Z',t.fur,t.sh)}${S('M19.7 11.4 19.6 4.3C19.5 3.2 18.7 3 18 3.6L13.6 7.2Z',t.fur,t.sh,{dx:.3})}
<path d="M5.7 9 5.8 5.4C5.9 5 6.2 4.9 6.5 5.1L8.9 7.2Z" fill="${PK}"/><path d="M18.3 9 18.2 5.4C18.1 5 17.8 4.9 17.5 5.1L15.1 7.2Z" fill="${PK}"/>
<path d="M6 8.2l.9-.4M6.2 7.2l.8.1M18 8.2l-.9-.4M17.8 7.2l-.8.1" stroke="${t.light}" stroke-width=".4" stroke-linecap="round"/>
${S(CAT_HEAD,t.fur,t.sh)}
<path d="M12 7v1.7M10.3 7.3l.35 1.3M13.7 7.3l-.35 1.3" stroke="${t.n?mix(t.fur,'#fff',.25):t.dark}" stroke-width=".65" stroke-linecap="round" opacity=".55"/>
${matte(8.2,9.6,2.2,1.1,-20,t.n?.28:.18)}${rim("M5.6 11.4Q6.6 7.8 10.4 6.9",t.n?.35:.25,.5)}
<ellipse cx="10.8" cy="16.6" rx="1.6" ry="1.2" fill="${t.light}"/><ellipse cx="13.2" cy="16.6" rx="1.6" ry="1.2" fill="${t.light}"/>
${eyes(13.3,3.5,1,t.n)}
${heart(12,15.45,.75,'#ff8fa8')}
${mouthW(16.5)}
<path d="M5.4 15.4 2.4 14.9M5.4 16.4l-2.9.6M18.6 15.4l3-.5M18.6 16.4l2.9.6" stroke="${t.n?'#d4d4d8':t.dark}" stroke-width=".32" stroke-linecap="round" opacity=".75"/>
${bOval(15.9,5.9,"#ff9db5",.45,1.25,.7)}`,
  dog: (t) => `
${S('M12 5.6C16.6 5.6 19.6 8.6 19.6 12.8 19.6 17.6 16.4 20.8 12 20.8S4.4 17.6 4.4 12.8C4.4 8.6 7.4 5.6 12 5.6Z',t.fur,t.sh)}
<path d="M12 7.6c.9 0 1.3 1.2 1.3 2.6 0 1.6 2.2 2.4 2.2 4.2H8.5c0-1.8 2.2-2.6 2.2-4.2 0-1.4.4-2.6 1.3-2.6Z" fill="${t.light}"/>
${matte(9.2,8.4,2.4,1.1,-15,t.n?.28:.18)}
${S('M6.6 7.2C3.4 6.2 1.4 10.2 2 14.4c.3 2.4 3 2.6 3.9.6L6.6 7.2Z',t.dark,mix(t.dark,t.fur,.4),{dx:.4,dy:-.4})}
${S('M17.4 7.2C20.6 6.2 22.6 10.2 22 14.4c-.3 2.4-3 2.6-3.9.6L17.4 7.2Z',t.dark,mix(t.dark,t.fur,.4),{dx:-.4,dy:-.4})}
<ellipse cx="12" cy="16.6" rx="3.9" ry="2.9" fill="${t.light}"/>
<ellipse cx="8.6" cy="9.9" rx=".7" ry=".45" fill="${t.dark}"/><ellipse cx="15.4" cy="9.9" rx=".7" ry=".45" fill="${t.dark}"/>
${eyes(12.5,3.3,1,t.n)}
<path d="M10.7 15.1c0-.7.6-1 1.3-1s1.3.3 1.3 1c0 .6-.7 1.1-1.3 1.1s-1.3-.5-1.3-1.1Z" fill="${INK}"/><ellipse cx="11.6" cy="14.6" rx=".45" ry=".22" fill="#fff" opacity=".8"/>
<path d="M12 16.2v.8M10.8 17q1.2.9 2.4 0" stroke="${INK}" stroke-width=".45" fill="none" stroke-linecap="round"/>
<path d="M11.35 17.45c0 1.1.3 1.5.65 1.5s.65-.4.65-1.5z" fill="#ff8fa8"/><path d="M12 17.6v.9" stroke="#e86a88" stroke-width=".25" stroke-linecap="round"/>
<circle cx="9.9" cy="16.9" r=".2" fill="${t.sh}"/><circle cx="9.5" cy="17.6" r=".2" fill="${t.sh}"/><circle cx="14.1" cy="16.9" r=".2" fill="${t.sh}"/><circle cx="14.5" cy="17.6" r=".2" fill="${t.sh}"/>
${bOval(15.1,5.5,"#ff8c6b",.42,1.15,1.05)}`,
  bunny: (t) => `
${S('M9.2 9.6C6.8 9 6.2 4.8 6.6 2.4 7 .5 9.3.6 9.7 2.5c.5 2.5.7 5.6-.5 7.1Z',t.fur,t.sh)}
${S('M14.8 9.6c2.2-.6 3.4-3.6 4.6-5.4 1-1.6-.4-3-1.8-2-1.6 1.2-3 3.6-3.6 5.4-.4 1.1-.1 1.8.8 2Z',t.fur,t.sh)}
<path d="M8.7 8.3C7.9 7.1 7.6 4.6 7.9 3c.2-.8.8-.8 1 0 .3 1.6.4 4.1-.2 5.3Z" fill="${PK}"/>
<path d="M15 8.1c1.3-.9 2.4-2.6 3.2-4 .4-.7-.1-1.1-.7-.6-1 .9-2.1 2.6-2.5 4.6Z" fill="${PK}"/>
${S('M12 8.6C16.8 8.6 20 11.4 20 15.4 20 19.2 16.6 21.6 12 21.6S4 19.2 4 15.4C4 11.4 7.2 8.6 12 8.6Z',t.fur,t.sh)}
<path d="M11.2 8.8q.5-1 1-.1.4-.9.9-.1" stroke="${t.fur}" stroke-width=".7" fill="none" stroke-linecap="round"/>
${matte(8.6,11.4,2.4,1.3,-25,t.n?.26:.16)}
<ellipse cx="10.9" cy="18.1" rx="1.6" ry="1.25" fill="${t.light}"/><ellipse cx="13.1" cy="18.1" rx="1.6" ry="1.25" fill="${t.light}"/>
${eyes(15,3.4,1,t.n)}
<ellipse cx="12" cy="17" rx=".8" ry=".55" fill="#ff8fa8"/><ellipse cx="11.8" cy="16.85" rx=".25" ry=".15" fill="#fff" opacity=".8"/>
<path d="M12 17.5v.5M10.9 18q.55.6 1.1 0 .55.6 1.1 0" stroke="${INK}" stroke-width=".42" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.3 18.3h1.4v.9q0 .3-.3.3h-.8q-.3 0-.3-.3z" fill="#fff" stroke="#e6e2ea" stroke-width=".18"/><path d="M12 18.3v1.2" stroke="#e6e2ea" stroke-width=".18"/>
${bOval(17.2,5.3,"#ff9ec4",.38,1.9,1.3)}`,
  duck: (t) => `
<path d="M11.4 6.4c-.8-1.6-.2-3.2 1.3-3.7-.3 1-.1 1.9.6 2.6M12.6 6.2c.2-1.2 1-1.9 2.1-1.9-.6.5-.8 1.2-.7 2" stroke="${t.fur}" stroke-width="1" fill="none" stroke-linecap="round"/>
${S('M12 5.2C16.4 5.2 19.8 8.4 19.8 13S16.4 20.8 12 20.8 4.2 17.6 4.2 13 7.6 5.2 12 5.2Z',t.fur,t.sh)}
${matte(8.6,8.6,2.2,1.1,-25,t.n?.28:.2)}${rim("M5.2 12.4Q5.6 8.2 9.6 6.2",t.n?.3:.22,.5)}
<path d="M7 19.4c1.4 1 3.2 1.5 5 1.5s3.6-.5 5-1.5c-1.6-.6-3.2-.9-5-.9s-3.4.3-5 .9Z" fill="${t.light}" opacity=".8"/>
${eyes(12.3,3.5,1,t.n)}
<path d="M8.6 16.6c.2 1.4 1.8 2.2 3.4 2.2s3.2-.8 3.4-2.2Z" fill="#f0952f"/>
<path d="M8.4 16.2c0-1.4 1.6-2.2 3.6-2.2s3.6.8 3.6 2.2c0 .6-1.6 1-3.6 1s-3.6-.4-3.6-1Z" fill="#ffb347"/>
<ellipse cx="11" cy="15" rx="1.2" ry=".35" fill="#fff" opacity=".45"/>
<circle cx="11.2" cy="15.4" r=".22" fill="#c86f1e"/><circle cx="12.8" cy="15.4" r=".22" fill="#c86f1e"/>
${bOval(14.7,5.8,"#ffa86b",.5,1.1,.7)}`,
  turtle: (t) => `
${S('M.4 24.6C1.2 18.4 6 16.2 12 16.2s10.8 2.2 11.6 8.4Z',t.fur,t.sh,{dy:.6})}
<path d="M12 17.4 9.2 19.4l.8 4.6h4l.8-4.6ZM9.2 19.4 4.8 18.6 3.6 23M14.8 19.4l4.4-.8L20.4 23" stroke="${t.dark}" stroke-width=".65" fill="${t.light}" fill-opacity=".25" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M.6 23.2c3.2-1 7-1.4 11.4-1.4s8.2.4 11.4 1.4" stroke="${t.light}" stroke-width=".7" fill="none" opacity=".6"/>${rim("M2.6 20.6Q5.4 17.8 9.4 17.2",.5,.55)}
${S('M12 4.4C16 4.4 19 7.4 19 11.4 19 15.4 16 18 12 18S5 15.4 5 11.4C5 7.4 8 4.4 12 4.4Z','#9fd27c','#7fb85c')}
${gloss(9.2,7.2,1.7,.8,-25,.45)}
<circle cx="8" cy="7.6" r=".65" fill="#86bd63"/><circle cx="16" cy="7.8" r=".5" fill="#86bd63"/><circle cx="12.6" cy="5.7" r=".5" fill="#86bd63"/><circle cx="14.4" cy="6.4" r=".3" fill="#86bd63"/>
<ellipse cx="12" cy="14.3" rx="3.2" ry="2.1" fill="#c4e8a8"/>
<circle cx="11.3" cy="13.5" r=".22" fill="#6aa34a"/><circle cx="12.7" cy="13.5" r=".22" fill="#6aa34a"/>
${eyes(11.4,3,1)}
${smile(14.5,1)}
${bOval(13.6,5,"#ff9db5",.5,.9,.9)}`,
  fish: (t) => `
${S('M9.2 6.8Q10.2 2.6 13.4 2.8 15.4 3.2 15 6.8Z',t.dark,mix(t.dark,t.fur,.4))}
<path d="M10.8 6.2l.5-2.4M12.4 6.2l.4-2.8M13.9 6.2l.2-2.4" stroke="${t.fur}" stroke-width=".35" stroke-linecap="round" opacity=".55"/>
${S('M5.4 13.4C3 11.8 1.2 12.8 1 14.6c1 .8 2.8 1 4.4.2Z',t.dark,mix(t.dark,t.fur,.4))}${S('M18.6 13.4c2.4-1.6 4.2-.6 4.4 1.2-1 .8-2.8 1-4.4.2Z',t.dark,mix(t.dark,t.fur,.4))}
<path d="M2.2 14.2l2 .2M2.4 13.4l2 .5M21.8 14.2l-2 .2M21.6 13.4l-2 .5" stroke="${t.fur}" stroke-width=".3" stroke-linecap="round" opacity=".55"/>
${S('M12 5.6C16.2 5.6 19.4 8.8 19.4 13.2S16.2 20.8 12 20.8 4.6 17.6 4.6 13.2 7.8 5.6 12 5.6Z',t.fur,t.sh,{in:`<path d="M4 14.6q8 4 16 0V22H4Z" fill="${t.light}" opacity=".75"/>`+[[8,18.6],[10.4,19.4],[13.6,19.4],[16,18.6],[9.2,20.6],[12,21],[14.8,20.6]].map(([x,y])=>`<path d="M${x-1} ${y}q1 1 2 0" stroke="${t.fur}" stroke-width=".35" fill="none" opacity=".6"/>`).join('')})}
<path d="M6.2 10.4q-1 2.8 0 5.6M17.8 10.4q1 2.8 0 5.6" stroke="${t.sh}" stroke-width=".45" fill="none" stroke-linecap="round" opacity=".8"/>
${gloss(8.4,8.6,1.9,.9,-30,t.n?.6:.55)}
${eyes(12,3.3,1.1,t.n)}
<ellipse cx="12" cy="15.7" rx="1" ry=".85" fill="#ff8fa8" stroke="${INK}" stroke-width=".35"/><ellipse cx="11.8" cy="15.5" rx=".3" ry=".2" fill="#fff" opacity=".7"/>
${bOval(14.3,5.3,"#ff7f8f",.45,1.4,.65)}${bSpark(14.3,5.3)}
<circle cx="19.6" cy="4.2" r="1" fill="#fff" fill-opacity=".4" stroke="#7cc6e8" stroke-width=".45"/><circle cx="21.3" cy="1.9" r=".6" fill="none" stroke="#7cc6e8" stroke-width=".4"/><circle cx="19.9" cy="3.8" r=".25" fill="#fff"/>`,
  unicorn: () => `
${S('M5.6 9.8 5.3 4.4C5.3 3.4 6.2 3.2 6.8 3.8L10 7.2Z','#fbf8ff','#e7e0f5')}${S('M18.4 9.8 18.7 4.4C18.7 3.4 17.8 3.2 17.2 3.8L14 7.2Z','#fbf8ff','#e7e0f5',{dx:.3})}
<path d="M6.7 8.2 6.6 5.4 8.5 7.2Z" fill="${PK}"/><path d="M17.3 8.2 17.4 5.4 15.5 7.2Z" fill="${PK}"/>
${S('M12 6.4C16.4 6.4 19.6 9.6 19.6 14 19.6 18.4 16.4 21.6 12 21.6S4.4 18.4 4.4 14C4.4 9.6 7.6 6.4 12 6.4Z','#fbf8ff','#e7e0f5')}

${[['#ff9fc0','M10.8 6.2C8.8 5.4 6.8 6.4 6.6 8.4c1-.8 2.4-.8 3.4 0'],['#ffc48a','M7.4 7.4C5.2 7.4 4 9.2 4.4 11.2c.7-1 1.8-1.4 3-1.2'],['#fff08a','M5.4 10.2C3.6 10.8 3 12.8 3.8 14.4c.4-1.1 1.3-1.7 2.4-1.8'],['#9fe6a8','M4.8 13.2C3.2 14 2.9 16 3.8 17.4c.4-1 1.2-1.6 2.2-1.6'],['#9fd0ff','M5 16.2C3.6 17 3.6 18.8 4.6 20c.3-1 1-1.6 1.9-1.6'],['#c8a8ff','M12.6 6.4C11 5 8.6 5.4 8.2 7.4c.9-.6 2.1-.6 3 0']].map(([c,d])=>`<path d="${d}Z" fill="${c}"/>`).join('')}
<path d="M13.4 6.6c-1.2 1.4-1.4 3-.6 4.4-1.4-.6-2.4-2-2.2-3.6.8-.6 1.8-.9 2.8-.8Z" fill="#c8a8ff"/><path d="M12.6 7.2c-.6.8-.8 1.8-.4 2.8" stroke="#fff" stroke-width=".3" opacity=".6" fill="none" stroke-linecap="round"/><path d="M10.9 7.2 11.75 1.3Q12 .7 12.25 1.3L13.1 7.2Q12 7.7 10.9 7.2Z" fill="#ffd66b"/><path d="M12 7.5 13.1 7.2 12.25 1.3Q12 .7 12 1Z" fill="#f2bf4f"/><path d="M11.05 6.1 12.95 5.4M11.25 4.5 12.75 3.9M11.45 2.9 12.5 2.5" stroke="#d99a2b" stroke-width=".42" stroke-linecap="round"/><path d="M11.6 6.6 11.95 1.8" stroke="#fff" stroke-width=".3" opacity=".7" stroke-linecap="round"/>
${matte(15.8,9.8,1.8,1,20,.5)}
<ellipse cx="12.6" cy="18.2" rx="4.1" ry="2.7" fill="#ffd6e4"/><ellipse cx="11.8" cy="17.2" rx="1.6" ry=".5" fill="#fff" opacity=".5"/>
<ellipse cx="11.2" cy="18" rx=".42" ry=".55" fill="#d9779b"/><ellipse cx="14" cy="18" rx=".42" ry=".55" fill="#d9779b"/>
${smile(19.6,.7,'#c55f86')}
${eye(9.6,13.6)}${eye(15.6,13.6)}
<path d="M8.7 12.7 7.9 12.3M8.9 12.2 8.4 11.6M16.5 12.7l.8-.4M16.3 12.2l.5-.6" stroke="${INK}" stroke-width=".35" stroke-linecap="round"/>
<ellipse cx="17.9" cy="15.8" rx="1.4" ry=".85" fill="#e9a3ff" opacity=".45"/><ellipse cx="7.4" cy="15.8" rx="1.2" ry=".75" fill="#e9a3ff" opacity=".35"/><path d="M19.6 13.4l.25.6.6.25-.6.25-.25.6-.25-.6-.6-.25.6-.25Z" fill="#ffd66b"/>`,
  penguin: () => `
<path d="M11.2 5.2c-.4-1.2.2-2.2 1-2.4-.1.7.1 1.3.6 1.6M12.4 5c.4-1 1.2-1.4 2-1.2-.5.3-.8.9-.8 1.5" stroke="#2d3a55" stroke-width=".9" fill="none" stroke-linecap="round"/>
${S('M12 4.6C16.8 4.6 20.4 8.2 20.4 13S16.8 21.4 12 21.4 3.6 17.8 3.6 13 7.2 4.6 12 4.6Z','#2d3a55','#1d2740')}
${rim("M5.2 11Q6 6.6 10.6 5.4",.4,.8)}${rim("M12.6 5.2Q14 5.2 15 5.6",.3,.6)}
${S('M12 10.2C10.6 7.6 5.6 8 5.6 12.4c0 4.6 3 7.8 6.4 7.8s6.4-3.2 6.4-7.8c0-4.4-5-4.8-6.4-2.2Z','#fbfbf7','#e6e8ee')}
${eyes(13.2,3,1)}
<path d="M10.6 15.2c0-.5.6-.7 1.4-.7s1.4.2 1.4.7c-.3.6-.8.8-1.4.8s-1.1-.2-1.4-.8Z" fill="#ffa53d"/><path d="M10.9 15.7c.3.7.7 1 1.1 1s.8-.3 1.1-1c-.3.2-.7.3-1.1.3s-.8-.1-1.1-.3Z" fill="#e8892a"/><ellipse cx="11.6" cy="14.9" rx=".4" ry=".15" fill="#fff" opacity=".6"/>
${bOval(15.4,4.6,"#ff6f9a",.55,1.05,1.05)}`,
  dragon: () => `
${S('M7.6 7.6 5.8 2.8C5.6 2 6.4 1.6 7 2.2L10 6.4Z','#ffe9b0','#e8c880')}${S('M16.4 7.6 18.2 2.8C18.4 2 17.6 1.6 17 2.2L14 6.4Z','#ffe9b0','#e8c880',{dx:.3})}
<path d="M6.6 4.6l1-.3M7.1 5.8l1-.4M17.4 4.6l-1-.3M16.9 5.8l-1-.4" stroke="#d8b060" stroke-width=".4" stroke-linecap="round"/>
${S('M4.8 10.2C2.8 8.4.8 8.8.6 10.4l1.4.4-.9 1 1.6.2-.4 1.2c1 .2 2-.3 2.6-1.2Z','#5cb87a','#479a63')}${S('M19.2 10.2c2-1.8 4-1.4 4.2.2l-1.4.4.9 1-1.6.2.4 1.2c-1 .2-2-.3-2.6-1.2Z','#5cb87a','#479a63')}
${S('M12 5.6C16.4 5.6 19.8 8.8 19.8 13.2 19.8 17.6 16.4 21.2 12 21.2S4.2 17.6 4.2 13.2C4.2 8.8 7.6 5.6 12 5.6Z','#7ccf8f','#5fb576')}
<path d="M11 6.2q1-1.8 2 0" fill="#5cc2b8"/><path d="M9.2 6.8q.7-1.2 1.6-.3M13.2 6.5q.9-.9 1.6.3" fill="#5cc2b8"/>
${gloss(8.6,8.8,1.8,.85,-25,.4)}${rim("M4.8 12.6Q5.2 9 8.6 6.8",.3,.5)}
<circle cx="15.8" cy="9" r=".35" fill="#5fb576"/><circle cx="16.8" cy="10" r=".3" fill="#5fb576"/><circle cx="15.6" cy="10.4" r=".25" fill="#5fb576"/>
<ellipse cx="12" cy="17.4" rx="4.1" ry="2.9" fill="#c8eec9"/><path d="M8.6 16.4q3.4-1 6.8 0" stroke="#a8dcab" stroke-width=".35" fill="none"/>
<ellipse cx="10.8" cy="16.5" rx=".3" ry=".42" fill="#3e8a57"/><ellipse cx="13.2" cy="16.5" rx=".3" ry=".42" fill="#3e8a57"/>
${eyes(12.8,3.4,1)}
${smile(18.2,1)}<path d="M12.6 18.6l.35.7.35-.6" fill="#fff"/>
${bHatch(15.3,5.8,"#ff7a6b",.85)}`,
  fox: () => `
${S('M3.9 12.2 4.3 3.4C4.4 2.4 5.2 2.2 5.9 2.9L10.6 7.4Z','#f08a3c','#d6702a')}${S('M20.1 12.2 19.7 3.4C19.6 2.4 18.8 2.2 18.1 2.9L13.4 7.4Z','#f08a3c','#d6702a',{dx:.3})}
<path d="M4.2 5.6 4.3 3.4C4.4 2.4 5.2 2.2 5.9 2.9L7 4Z" fill="#4a3428"/><path d="M19.8 5.6 19.7 3.4C19.6 2.4 18.8 2.2 18.1 2.9L17 4Z" fill="#4a3428"/>
<path d="M5.8 9.8 6 6 8.8 8.2Z" fill="#ffe2c4"/><path d="M18.2 9.8 18 6 15.2 8.2Z" fill="#ffe2c4"/>
<path d="M6.2 8.6l1-.6M6.4 7.6l.9-.1M17.8 8.6l-1-.6M17.6 7.6l-.9-.1" stroke="#fff" stroke-width=".35" stroke-linecap="round"/>
${S('M12 7C16.6 7 20 9.6 20.3 13.2L21.6 14.8 20.2 15.2 20.8 16.4 19.4 16.6C18.4 19.4 15.4 21.2 12 21.2S5.6 19.4 4.6 16.6L3.2 16.4 3.8 15.2 2.4 14.8 3.7 13.2C4 9.6 7.4 7 12 7Z','#f08a3c','#d6702a')}
<path d="M3.6 14.2C6 14.6 9 15.6 12 15.6s6-1 8.4-1.4l-.2.6 1.4.4-1.4.4.6 1.2-1.4.2C18.4 19.4 15.4 21.2 12 21.2s-6.4-1.8-7.4-4.6L3.2 16.4l.6-1.2-1.4-.4 1.4-.4Z" fill="#fff6ec"/>
<path d="M11.2 7.4 12 9.6l.8-2.2" fill="#d6702a" opacity=".6"/>
${matte(8.8,9.8,2.2,1,-15,.18)}${rim("M4.8 12.4Q6.2 8.4 10.2 7.6",.25,.5)}
${eyes(13.2,3.4,1)}
<path d="M11 16.2c0-.5.5-.7 1-.7s1 .2 1 .7-.5.8-1 .8-1-.3-1-.8Z" fill="${INK}"/><ellipse cx="11.7" cy="15.9" rx=".3" ry=".14" fill="#fff" opacity=".8"/>
${mouthW(17.4)}
${bOval(16.1,5.4,"#ff9b7a",.35,1,.55)}`,
  whale: () => `
<path d="M12 7.6c-.2-1.6.2-2.8 1-3.6M12 7.6c-1.2-1.2-2.6-1.6-3.8-1.2M12 7.6c1.2-1.2 2.6-1.4 3.8-.8" stroke="#7cc6e8" stroke-width=".9" stroke-linecap="round" fill="none"/>
<path d="M13.2 2.6q.7 1 0 1.6-.7-.6 0-1.6ZM7.6 5.2q.6.8 0 1.3-.6-.5 0-1.3ZM16.6 5.4q.6.8 0 1.3-.6-.5 0-1.3Z" fill="#a9dcf2"/>
${S('M3.4 17C1.8 17.4.8 18.8 1.2 20c1.2.2 2.4-.4 3-1.4ZM20.6 17c1.6.4 2.6 1.8 2.2 3-1.2.2-2.4-.4-3-1.4Z','#4a7cc2','#3a68a8')}
${S('M12 8C17.8 8 21.4 12 21.4 16.2 21.4 20.6 17.4 22.6 12 22.6S2.6 20.6 2.6 16.2C2.6 12 6.2 8 12 8Z','#5b8fd6','#4a7cc2',{in:`<path d="M2 18.2c2.6 2 17.4 2 20 0V24H2Z" fill="#dcecff"/>`+[7.2,9.6,12,14.4,16.8].map(x=>`<path d="M${x} 20.4v2" stroke="#b9d4f2" stroke-width=".4" stroke-linecap="round"/>`).join('')})}
${gloss(8.2,11,2.2,1,-25,.6)}${rim("M17.4 9.6Q20 11.4 20.6 14",.35,.5)}
<circle cx="14.6" cy="10.4" r=".4" fill="#86afe6"/><circle cx="15.8" cy="11.2" r=".3" fill="#86afe6"/><circle cx="16.2" cy="10" r=".25" fill="#86afe6"/>
${eyes(15,3.6,1)}
${smile(17.2,1.2)}
${bOval(17.2,6,"#d9a3ff",.55,1.4,.8)}${bSpark(17.2,6)}`,
  schrodinger: () => `
<ellipse cx="16.4" cy="2.7" rx="2.6" ry=".9" fill="none" stroke="#ffd66b" stroke-width=".8"/><ellipse cx="16.4" cy="2.5" rx="2.6" ry=".9" fill="none" stroke="#fff3bf" stroke-width=".3"/>
${S('M4.8 10 5 4C5.1 3 5.9 2.9 6.6 3.5L9.8 6.6Z','#8b8b95','#74747e')}
<path d="M6.2 7.8 6.3 5.4 8.2 6.8Z" fill="${PK}"/>
<path d="M19.2 10 19 4C18.9 3 18.1 2.9 17.4 3.5L14.2 6.6Z" fill="#dcd9ee"/><path d="M17.8 7.8 17.7 5.4 15.8 6.8Z" fill="#c9c4e2"/>
${S('M12 5.2C7.9 5.2 4.6 8.2 4.6 11.8S7.9 18.4 12 18.4Z','#8b8b95','#74747e')}
<path d="M12 5.2C16.1 5.2 19.4 8.2 19.4 11.8S16.1 18.4 12 18.4Z" fill="#dcd9ee"/>
<path d="M18.8 13.4q.6.4.2 1.2M19.2 11.2q.5.3.3.9" stroke="#c9c4e2" stroke-width=".4" fill="none" stroke-linecap="round"/>
<path d="M12 5.4v12.8" stroke="#fff" stroke-width=".35" stroke-dasharray=".8 .8" opacity=".8"/>
<path d="M8 6.6v1.2M9.4 6.2l.2 1.1" stroke="#74747e" stroke-width=".55" stroke-linecap="round"/>
${matte(8.2,8.6,1.8,.9,-20,.22)}<ellipse cx="15.8" cy="11.8" rx="3.6" ry="5.6" fill="#fff" opacity=".18"/>
${eye(8.6,11.6)}
<path d="M14.6 10.8l1.6 1.6M16.2 10.8l-1.6 1.6" stroke="#8a86a6" stroke-width=".65" stroke-linecap="round"/>
${heart(12,13.7,.6,'#ff8fa8')}
${mouthW(14.5)}
<path d="M12.6 14.7q.2 1.4.9 1.2.5-.2.1-1.1" fill="#ffa3b8" stroke="#ff8fa8" stroke-width=".25"/>
<ellipse cx="6.6" cy="14" rx="1.25" ry=".8" fill="#ff9db5" opacity=".55"/>
<path d="M18.6 15.2h2.4M18.4 16.2l2.2.6M5.4 15.2H3M5.6 16.2l-2.2.6" stroke="#b3afc8" stroke-width=".35" stroke-linecap="round"/>
<path d="M1.6 16.6.2 14.6 3.4 15.4ZM22.4 16.6l1.4-2-3.2.8Z" fill="#c4915a"/>
${S('M1.6 16.6h20.8l-1 7.4H2.6Z','#d6a36a','#bd8a52',{in:'<path d="M1.6 16.6h20.8v1.6H1.6z" fill="#b9824a"/><path d="M11 18.2h2V24h-2z" fill="#e8c48e" opacity=".55"/>'})}
<ellipse cx="7.6" cy="17" rx="1.6" ry="1" fill="#8b8b95"/><path d="M7.1 17.3v-.6M8.1 17.3v-.6" stroke="#74747e" stroke-width=".3" stroke-linecap="round"/>
<ellipse cx="16.4" cy="17" rx="1.6" ry="1" fill="#dcd9ee"/><path d="M15.9 17.3v-.6M16.9 17.3v-.6" stroke="#c0bbd8" stroke-width=".3" stroke-linecap="round"/>
<path d="M11.3 20.6c0-.7.3-1.1.7-1.1s.8.4.8.9c0 .8-.8.7-.8 1.4M12 22.8v.1" stroke="#8a5a2b" stroke-width=".55" stroke-linecap="round" fill="none"/>`,
  frog: () => `
${S('M7.6 5.6C9.5 5.6 11 7.1 11 9S9.5 12.4 7.6 12.4 4.2 10.9 4.2 9 5.7 5.6 7.6 5.6ZM16.4 5.6C18.3 5.6 19.8 7.1 19.8 9S18.3 12.4 16.4 12.4 13 10.9 13 9 14.5 5.6 16.4 5.6Z','#93d673','#74bb55')}
${S('M12 8.6C17 8.6 20.6 11.6 20.6 15.2S17 21.8 12 21.8 3.4 18.8 3.4 15.2 7 8.6 12 8.6Z','#93d673','#74bb55')}
${gloss(6.4,7,.9,.45,-30,.7)}${gloss(15.2,7,.9,.45,-30,.7)}${gloss(7.4,11.6,1.1,.45,-15,.35)}
<circle cx="7.6" cy="9.3" r="2.15" fill="#fff"/><circle cx="16.4" cy="9.3" r="2.15" fill="#fff"/>
${eye(7.7,9.5,1.15)}${eye(16.3,9.5,1.15)}
<circle cx="9.4" cy="12.4" r=".45" fill="#7fc45e"/><circle cx="14.2" cy="12" r=".55" fill="#7fc45e"/><circle cx="15.2" cy="12.9" r=".35" fill="#7fc45e"/><circle cx="5.6" cy="17" r=".4" fill="#7fc45e"/>
<ellipse cx="12" cy="19.2" rx="4.8" ry="2.4" fill="#d9f2bf"/>
<circle cx="11.3" cy="13.6" r=".22" fill="#5a9a40"/><circle cx="12.7" cy="13.6" r=".22" fill="#5a9a40"/>
${mouthW(15.9)}
${bOval(14.8,6,"#ff7fb0",.55,1.7,1)}${bSpark(14.7,6)}
<g transform="translate(19.2 5.1)">${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-.85" rx=".6" ry=".85" fill="${PK}" transform="rotate(${a})"/>`).join('')}<circle r=".5" fill="#ffd66b"/></g>
<path d="M18.2 6.4q-.6.4-.8 1.1" stroke="#74bb55" stroke-width=".4" fill="none" stroke-linecap="round"/><ellipse cx="17.6" cy="6.8" rx=".5" ry=".25" fill="#74bb55" transform="rotate(-30 17.6 6.8)"/>`,
  shark: () => `
${S('M9.8 6.6 12.4 1.2C12.7.6 13.3.7 13.4 1.4L14.6 6.6Z','#6f87a8','#5a7090')}
${S('M4.4 15.6C2.2 15.4.8 16.8 1 18.4c1.4.2 2.8-.4 3.8-1.4ZM19.6 15.6c2.2-.2 3.6 1.2 3.4 2.8-1.4.2-2.8-.4-3.8-1.4Z','#6f87a8','#5a7090')}
${S('M12 5.6C16.6 5.6 20 9 20 13.6S16.6 21.6 12 21.6 4 18.2 4 13.6 7.4 5.6 12 5.6Z','#8aa2c2','#7088aa',{in:'<path d="M3.6 14.8c1.8.8 4.8 1.4 8.4 1.4s6.6-.6 8.4-1.4V23H3.6Z" fill="#f3f6fa"/><path d="M3.6 14.8c1.8.8 4.8 1.4 8.4 1.4s6.6-.6 8.4-1.4" stroke="#dfe6ef" stroke-width=".5" fill="none"/>'})}
${gloss(8.4,8.8,2,.9,-28,.55)}
<path d="M5.4 10.6q-.5 1 0 2M6.2 10.2q-.5 1.2 0 2.4M18.6 10.6q.5 1 0 2M17.8 10.2q.5 1.2 0 2.4" stroke="#6f87a8" stroke-width=".4" fill="none" stroke-linecap="round"/>
${eyes(12.4,3.4,1)}
<path d="M9.4 17q2.6 2 5.2 0" stroke="${INK}" stroke-width=".45" fill="none" stroke-linecap="round"/>
<path d="M10.7 17.75l.45.8.45-.6zM12.4 17.85l.45.7.45-.8z" fill="#fff" stroke="#dfe6ef" stroke-width=".15" stroke-linejoin="round"/>
${bOval(14.9,5.6,"#ffb3c4",.3,1,.55)}`,
};
const BG: Record<Species, string> = {cat:'#ffeed6',dog:'#dceffd',bunny:'#ffe3ee',duck:'#eef8d8',turtle:'#dff5e4',fish:'#dceffd',unicorn:'#f1ebff',penguin:'#dceffd',dragon:'#e2f6e6',fox:'#ffeedd',whale:'#dceffd',schrodinger:'#efeff3',frog:'#eef8d8',shark:'#dceffd'};

/** Où poser un accessoire sur la tête de face : centre et rayon de la tête (repère 24×24). */
export const FACE_ANCHOR: Record<Species, { x: number; y: number; r: number }> = {
  cat: { x: 12, y: 13.6, r: 7.2 },
  dog: { x: 12, y: 13.2, r: 7.6 },
  bunny: { x: 12, y: 15.2, r: 6.6 },
  duck: { x: 12, y: 13, r: 7.8 },
  turtle: { x: 12, y: 11.2, r: 6.8 },
  fish: { x: 12, y: 13, r: 7.4 },
  unicorn: { x: 12, y: 14, r: 7.6 },
  penguin: { x: 12, y: 13, r: 8.4 },
  dragon: { x: 12, y: 13.2, r: 7.6 },
  fox: { x: 12, y: 14, r: 7 },
  whale: { x: 12, y: 15.4, r: 7.4 },
  schrodinger: { x: 12, y: 12, r: 6.8 },
  frog: { x: 12, y: 13.4, r: 7.8 },
  shark: { x: 12, y: 13.6, r: 8 },
};

/** La tête de face (fond compris), en SVG. `uid` : préfixe unique (les clipPath ne doivent pas se mélanger entre avatars). */
export function faceSvg(species: Species, fur: string, dark: string, night: boolean, uid: string) {
  PFX = uid; UID = 0;
  const t: Tone = { fur, dark, light: mix(fur, "#ffffff", 0.55), sh: mix(dark, fur, 0.35), n: night };
  const draw = FACE[species];
  return `<rect width="24" height="24" fill="${BG[species] ?? "#f4f4f5"}"/>${draw ? draw(t) : ""}`;
}
