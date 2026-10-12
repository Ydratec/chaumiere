// Tickets à gratter : lots, probabilités et règles (fonctions pures, testées dans tests/unit/scratch.test.ts).
// Le lot est tiré d'abord ; la règle (tirée au hasard) ne fait que mettre en scène ce lot : le retour moyen ne dépend pas d'elle.
import { ITEMS, type Inventory } from "../farm/catalog.ts";

export type Prize = { label: string; delta: Inventory };
const coins = (n: number): Prize => ({ label: `${n.toLocaleString("fr-FR")} pièces`, delta: { coins: n } });

export const PRIZES: Record<string, Prize> = {
  c25: coins(25), c50: coins(50), c100: coins(100), c200: coins(200), c250: coins(250), c500: coins(500), c1000: coins(1000),
  c2000: coins(2000), c2500: coins(2500), c5000: coins(5000), c10000: coins(10000), c25000: coins(25000), c50000: coins(50000), c100000: coins(100000),
  orchid: { label: "Une orchidée", delta: { orchid: 1 } },
  moon: { label: "Une fleur de lune", delta: { moonflower: 1 } },
  moon3: { label: "3 fleurs de lune", delta: { moonflower: 3 } },
};
/** Valeur d'un lot en pièces (les fleurs au prix de vente). */
export const valueOf = (id: string) => Object.entries(PRIZES[id].delta).reduce((n, [k, v]) => n + (k === "coins" ? v! : ITEMS[k as keyof typeof ITEMS].price * v!), 0);

export type Kind = "small" | "medium" | "big";
/** `odds` : chances de chaque lot par ticket (le reste : ticket perdant). Le dernier lot est le gros lot. */
export const TICKETS: Record<Kind, { name: string; price: number; odds: [string, number][] }> = {
  small: {
    name: "Trèfle", price: 50,
    odds: [["c25", 0.18], ["c50", 0.13], ["c100", 0.08], ["c200", 0.04], ["c500", 0.012], ["c2000", 0.0025], ["orchid", 0.01], ["moon", 0.001], ["c5000", 0.0006]],
  },
  medium: {
    name: "Étoile", price: 250,
    odds: [["c100", 0.2], ["c250", 0.12], ["c500", 0.08], ["c1000", 0.045], ["c2500", 0.015], ["c10000", 0.0025], ["moon", 0.02], ["c25000", 0.0006]],
  },
  big: {
    name: "Diamant", price: 1000,
    odds: [["c500", 0.2], ["c1000", 0.12], ["c2000", 0.08], ["c5000", 0.035], ["c10000", 0.015], ["c50000", 0.002], ["moon3", 0.02], ["c100000", 0.0005]],
  },
};
export const isKind = (k: unknown): k is Kind => typeof k === "string" && k in TICKETS;

/** Part moyenne de la mise rendue en lots (0,85 = on récupère 85 % en moyenne). */
export const returnRate = (k: Kind) => TICKETS[k].odds.reduce((n, [id, p]) => n + p * valueOf(id), 0) / TICKETS[k].price;
/** Part des tickets qui gagnent quelque chose. */
export const winRate = (k: Kind) => TICKETS[k].odds.reduce((n, [, p]) => n + p, 0);
/** Gros lot du ticket (le plus rare). */
export const jackpot = (k: Kind) => TICKETS[k].odds.at(-1)![0];

// ---------- Règles ----------

export type Layout =
  | { rule: "same" | "line"; cells: string[] } // 9 cases (3 × 3) de lots
  | { rule: "number"; win: number; entries: { n: number; p: string }[] }; // numéro gagnant et 6 numéros avec leur lot
export const RULES = {
  same: { name: "Trois identiques", text: "Trois cases identiques : tu gagnes ce lot." },
  line: { name: "Ligne de trois", text: "Trois cases identiques alignées (ligne, colonne ou diagonale) : tu gagnes ce lot." },
  number: { name: "Numéro gagnant", text: "Si l'un de tes numéros est le numéro gagnant, tu gagnes le lot qui est dessous." },
} as const;
export type Rule = keyof typeof RULES;
const RULE_IDS = Object.keys(RULES) as Rule[];

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

/** Lot gagné par cette disposition, ou null. */
export function evaluate(l: Layout): string | null {
  if (l.rule === "number") return l.entries.find((e) => e.n === l.win)?.p ?? null;
  const count: Record<string, number> = {};
  for (const c of l.cells) count[c] = (count[c] ?? 0) + 1;
  if (l.rule === "same") return Object.keys(count).find((c) => count[c] >= 3) ?? null;
  return LINES.map((ln) => ln.map((i) => l.cells[i])).find((v) => v[0] === v[1] && v[1] === v[2])?.[0] ?? null;
}

/** Cases (indices) qui font gagner, pour les mettre en valeur ; pour « numéro », l'indice du numéro gagnant. */
export function winningCells(l: Layout): number[] {
  const p = evaluate(l);
  if (!p) return [];
  if (l.rule === "number") return [l.entries.findIndex((e) => e.n === l.win)];
  if (l.rule === "same") return l.cells.flatMap((c, i) => (c === p ? [i] : []));
  return LINES.find((ln) => ln.every((i) => l.cells[i] === p)) ?? [];
}

/** Au plus un trio sur la grille : une seule valeur peut apparaître 3 fois (jamais plus), les autres au plus 2 fois. */
export function oneTrio(cells: string[]) {
  const count: Record<string, number> = {};
  for (const c of cells) count[c] = (count[c] ?? 0) + 1;
  const n = Object.values(count);
  return n.every((x) => x <= 3) && n.filter((x) => x === 3).length <= 1;
}

type Rand = () => number;
const pick = <T,>(xs: T[], rand: Rand) => xs[Math.floor(rand() * xs.length)];
const shuffle = <T,>(xs: T[], rand: Rand) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** « Presque » sur un ticket perdant : arrive assez souvent, ça donne envie de réessayer. */
const NEAR = 0.45;

function grid(kind: Kind, rule: "same" | "line", prize: string | null, rand: Rand): string[] {
  const ids = TICKETS[kind].odds.map(([id]) => id);
  const top = ids.slice(-4); // les plus gros lots (près de la fin de la table)
  for (let tries = 0; tries < 500; tries++) {
    const cells: (string | null)[] = Array(9).fill(null);
    if (prize) {
      const where = rule === "line" ? pick(LINES, rand) : shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], rand).slice(0, 3);
      for (const i of where) cells[i] = prize;
    } else if (rand() < NEAR) {
      // presque : deux gros lots côte à côte (« line »), ou trois identiques mais pas alignés (« line »), ou deux identiques (« same »)
      const t = pick(top, rand);
      const spots = rule === "line" && rand() < 0.5 ? shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], rand).slice(0, 3) : pick(LINES, rand).slice(0, 2);
      for (const i of spots) cells[i] = t;
    }
    for (let i = 0; i < 9; i++) cells[i] ??= pick(ids.filter((x) => x !== prize), rand);
    const out = cells as string[];
    if (oneTrio(out) && evaluate({ rule, cells: out }) === prize) return out;
  }
  throw new Error("disposition impossible"); // ponytail: ne devrait jamais arriver ; la table a assez de lots différents
}

function numbers(kind: Kind, prize: string | null, rand: Rand): Extract<Layout, { rule: "number" }> {
  const ids = TICKETS[kind].odds.map(([id]) => id);
  const top = ids.slice(-4);
  const win = 1 + Math.floor(rand() * 30);
  const used = new Set<number>([win]);
  const fresh = () => {
    for (;;) {
      const n = 1 + Math.floor(rand() * 30);
      if (!used.has(n)) return used.add(n), n;
    }
  };
  const entries: { n: number; p: string }[] = [];
  if (prize) entries.push({ n: win, p: prize });
  else if (rand() < NEAR) {
    // presque : un numéro voisin du gagnant, avec un gros lot dessous
    const near = [win - 1, win + 1].filter((n) => n >= 1 && n <= 30);
    const n = pick(near, rand);
    used.add(n);
    entries.push({ n, p: pick(top, rand) });
  }
  while (entries.length < 6) entries.push({ n: fresh(), p: pick(ids, rand) });
  return { rule: "number", win, entries: shuffle(entries, rand) };
}

/** Tire un ticket : le lot selon les chances, puis une règle au hasard et la disposition qui y mène. */
export function drawTicket(kind: Kind, rand: Rand = Math.random): { layout: Layout; prize: string | null } {
  let r = rand();
  let prize: string | null = null;
  for (const [id, p] of TICKETS[kind].odds) {
    if ((r -= p) < 0) { prize = id; break; }
  }
  const rule = pick(RULE_IDS, rand);
  return { prize, layout: rule === "number" ? numbers(kind, prize, rand) : { rule, cells: grid(kind, rule, prize, rand) } };
}
