// Hashi (les ponts) : relier les îles par des ponts horizontaux ou verticaux (1 ou 2 entre deux îles), sans croisement,
// pour que chaque île ait exactement son nombre de ponts et que toutes les îles soient reliées entre elles.
// La grille du jour n'a qu'une seule solution. Fonctions pures, testées dans tests/unit/puzzles.test.ts.

export const HN = 9;
export type Island = { x: number; y: number; n: number };
export type Hashi = { islands: Island[] };
export type Bridge = { a: number; b: number; n: 1 | 2 };
type Edge = { a: number; b: number; h: boolean; lo: number; hi: number; at: number }; // segment entre deux îles voisines

/** Les paires d'îles qui se voient (même ligne ou colonne, aucune île entre elles). */
export function edgesOf(islands: { x: number; y: number }[]): Edge[] {
  const at = new Map(islands.map((s, i) => [s.y * HN + s.x, i]));
  const out: Edge[] = [];
  islands.forEach((s, i) => {
    for (let x = s.x + 1; x < HN; x++) { const j = at.get(s.y * HN + x); if (j !== undefined) { out.push({ a: i, b: j, h: true, lo: s.x, hi: x, at: s.y }); break; } }
    for (let y = s.y + 1; y < HN; y++) { const j = at.get(y * HN + s.x); if (j !== undefined) { out.push({ a: i, b: j, h: false, lo: s.y, hi: y, at: s.x }); break; } }
  });
  return out;
}
const crosses = (e: Edge, f: Edge) => e.h !== f.h && (e.h ? f.lo < e.at && e.at < f.hi && e.lo < f.at && f.at < e.hi : e.lo < f.at && f.at < e.hi && f.lo < e.at && e.at < f.hi);

function connected(n: number, links: [number, number][]) {
  const adj = Array.from({ length: n }, () => [] as number[]);
  for (const [a, b] of links) { adj[a].push(b); adj[b].push(a); }
  const seen = new Set([0]), stack = [0];
  while (stack.length) for (const k of adj[stack.pop()!]) if (!seen.has(k)) { seen.add(k); stack.push(k); }
  return seen.size === n;
}

/** Solutions (au plus `stop`) : nombre de ponts sur chaque segment. */
export function solveHashi(p: Hashi, stop = 2): number[][] {
  const E = edgesOf(p.islands), n = p.islands.length;
  const cross = E.map((e) => E.map((f, j) => (crosses(e, f) ? j : -1)).filter((j) => j >= 0));
  const need = p.islands.map((s) => s.n), val = Array(E.length).fill(-1), out: number[][] = [];
  const byIsland = p.islands.map((_, i) => E.map((e, k) => (e.a === i || e.b === i ? k : -1)).filter((k) => k >= 0));
  // Ponts encore possibles autour d'une île : segments pas encore décidés, pas coupés par un pont déjà posé.
  const room = (i: number) => byIsland[i].reduce((sum, k) => {
    if (val[k] !== -1 || cross[k].some((j) => val[j] > 0)) return sum;
    const other = E[k].a === i ? E[k].b : E[k].a;
    return sum + Math.min(2, need[other]);
  }, 0);
  const ok = () => p.islands.every((_, i) => need[i] >= 0 && need[i] <= room(i));
  const go = (k: number) => {
    if (out.length >= stop) return;
    if (k === E.length) {
      if (need.every((v) => v === 0) && connected(n, E.flatMap((x, j) => (val[j] > 0 ? [[x.a, x.b] as [number, number]] : [])))) out.push([...val]);
      return;
    }
    const blocked = cross[k].some((j) => val[j] > 0);
    for (const v of blocked ? [0] : [2, 1, 0]) {
      const { a, b } = E[k];
      if (v > need[a] || v > need[b]) continue;
      val[k] = v; need[a] -= v; need[b] -= v;
      if (ok()) go(k + 1);
      val[k] = -1; need[a] += v; need[b] += v;
    }
  };
  go(0);
  return out;
}

/** Vérifie une proposition de ponts : segments existants, sans croisement, nombres respectés, tout relié. */
export function checkHashi(p: Hashi, bridges: unknown): boolean {
  if (!Array.isArray(bridges)) return false;
  const E = edgesOf(p.islands), count = Array(E.length).fill(0);
  for (const br of bridges) {
    if (!br || typeof br !== "object") return false;
    const { a, b, n } = br as Bridge;
    const k = E.findIndex((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
    if (k < 0 || (n !== 1 && n !== 2) || count[k]) return false;
    count[k] = n;
  }
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) if (count[i] && count[j] && crosses(E[i], E[j])) return false;
  const deg = p.islands.map(() => 0);
  E.forEach((e, k) => { deg[e.a] += count[k]; deg[e.b] += count[k]; });
  if (!deg.every((d, i) => d === p.islands[i].n)) return false;
  return connected(p.islands.length, E.flatMap((e, k) => (count[k] ? [[e.a, e.b] as [number, number]] : [])));
}

/** Un réseau d'îles qui pousse depuis une île : on ajoute des îles au bout de nouveaux ponts, puis quelques ponts en plus. */
function randomNetwork(rand: () => number, want: number) {
  const pts: { x: number; y: number }[] = [{ x: Math.floor(rand() * HN), y: Math.floor(rand() * HN) }];
  const used = new Set<number>(); // cases traversées par un pont
  const links: { a: number; b: number; n: number; cells: number[] }[] = [];
  const isl = (x: number, y: number) => pts.findIndex((s) => s.x === x && s.y === y);
  for (let tries = 0; tries < 2000 && pts.length < want; tries++) {
    const a = Math.floor(rand() * pts.length), [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rand() * 4)];
    const len = 2 + Math.floor(rand() * 4);
    const x = pts[a].x + dx * len, y = pts[a].y + dy * len;
    if (x < 0 || y < 0 || x >= HN || y >= HN || isl(x, y) >= 0) continue;
    const cells = Array.from({ length: len - 1 }, (_, i) => (pts[a].y + dy * (i + 1)) * HN + pts[a].x + dx * (i + 1));
    if (cells.some((c) => used.has(c) || isl(c % HN, Math.floor(c / HN)) >= 0)) continue;
    // pas d'île collée à une autre (plus lisible)
    if (pts.some((s) => Math.abs(s.x - x) + Math.abs(s.y - y) === 1)) continue;
    if (used.has(y * HN + x)) continue;
    pts.push({ x, y });
    cells.forEach((c) => used.add(c));
    links.push({ a, b: pts.length - 1, n: rand() < 0.35 ? 2 : 1, cells });
  }
  return { pts, links };
}

/** La grille du jour : premier réseau (selon la graine) dont les nombres ne laissent qu'une solution. */
export function dailyHashi(rand: () => number): { puzzle: Hashi; solution: Bridge[] } {
  for (let tries = 0; tries < 300; tries++) {
    const { pts, links } = randomNetwork(rand, 14 + Math.floor(rand() * 5));
    if (pts.length < 12) continue;
    const islands = pts.map((s, i) => ({ ...s, n: links.reduce((t, l) => t + (l.a === i || l.b === i ? l.n : 0), 0) }));
    // Les ponts du réseau doivent être des segments « voisins » (aucune île entre deux) : sinon on recommence.
    const E = edgesOf(islands);
    if (!links.every((l) => E.some((e) => (e.a === l.a && e.b === l.b) || (e.a === l.b && e.b === l.a)))) continue;
    const puzzle = { islands };
    const sols = solveHashi(puzzle, 2);
    if (sols.length === 1) return { puzzle, solution: links.map((l) => ({ a: l.a, b: l.b, n: l.n as 1 | 2 })) };
  }
  throw new Error("Aucune grille de ponts trouvée");
}
