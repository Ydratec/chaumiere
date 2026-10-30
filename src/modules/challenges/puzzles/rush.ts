// Embouteillage (inspiré de Rush Hour) : grille 6 × 6, la charrette (véhicule 0, horizontal, ligne 2) doit sortir à droite.
// Chaque véhicule glisse seulement dans son sens ; un déplacement (de n'importe quelle longueur) compte 1 coup.
// Le générateur garde une grille dont la solution la plus courte demande beaucoup de coups (calculée par recherche en largeur).
// Fonctions pures, testées dans tests/unit/puzzles.test.ts.

export const RN = 6;
export const EXIT_ROW = 2;
export type Car = { x: number; y: number; len: 2 | 3; h: boolean }; // h : horizontal
export type Rush = { cars: Car[] }; // cars[0] : la charrette
export type Move = { car: number; to: number }; // nouvelle position (x si horizontal, y sinon)

const cellsOf = (c: Car) => Array.from({ length: c.len }, (_, i) => (c.h ? (c.y * RN + c.x + i) : ((c.y + i) * RN + c.x)));
function occupancy(cars: Car[], skip = -1) {
  const g = new Int8Array(RN * RN).fill(-1);
  cars.forEach((c, i) => { if (i !== skip) for (const k of cellsOf(c)) g[k] = i; });
  return g;
}

/** Positions possibles d'un véhicule (en glissant, sans sauter par-dessus un autre). */
export function reach(cars: Car[], i: number): number[] {
  const c = cars[i], g = occupancy(cars, i), out: number[] = [];
  const at = (p: number) => (c.h ? Array.from({ length: c.len }, (_, k) => c.y * RN + p + k) : Array.from({ length: c.len }, (_, k) => (p + k) * RN + c.x));
  const start = c.h ? c.x : c.y;
  for (const dir of [-1, 1]) for (let p = start + dir; p >= 0 && p + c.len <= RN; p += dir) {
    if (at(p).some((k) => g[k] !== -1)) break;
    out.push(p);
  }
  return out;
}

export const solved = (cars: Car[]) => cars[0].x + cars[0].len === RN;
export const moved = (cars: Car[], m: Move): Car[] => cars.map((c, i) => (i === m.car ? (c.h ? { ...c, x: m.to } : { ...c, y: m.to }) : c));

/**
 * Nombre minimal de coups pour sortir la charrette (null : impossible ou trop d'états).
 * Recherche en largeur rapide : un état = la position de chaque véhicule, rangée dans un seul nombre.
 */
export function minMoves(start: Car[], limit = 120_000): number | null {
  const n = start.length, fixed = start.map((c) => (c.h ? c.y : c.x)), len = start.map((c) => c.len), hor = start.map((c) => c.h);
  const pow = Array.from({ length: n }, (_, i) => 6 ** i);
  const pos0 = start.map((c) => (c.h ? c.x : c.y));
  const enc = (p: number[]) => p.reduce((s, v, i) => s + v * pow[i], 0);
  const seen = new Set<number>([enc(pos0)]);
  let frontier: number[][] = [pos0];
  const occ = new Int8Array(RN * RN);
  for (let depth = 0; frontier.length; depth++) {
    const next: number[][] = [];
    for (const p of frontier) {
      if (p[0] + len[0] === RN) return depth;
      occ.fill(0);
      for (let i = 0; i < n; i++) for (let k = 0; k < len[i]; k++) occ[hor[i] ? fixed[i] * RN + p[i] + k : (p[i] + k) * RN + fixed[i]] = 1;
      for (let i = 0; i < n; i++) {
        const cell = (q: number) => (hor[i] ? fixed[i] * RN + q : q * RN + fixed[i]);
        for (const dir of [-1, 1]) {
          for (let q = p[i] + dir; q >= 0 && q + len[i] <= RN; q += dir) {
            if (occ[cell(dir < 0 ? q : q + len[i] - 1)]) break; // la case qu'on gagne en avançant doit être libre
            const np = p.slice(); np[i] = q;
            const k = enc(np);
            if (!seen.has(k)) {
              seen.add(k);
              if (seen.size > limit) return null;
              next.push(np);
            }
          }
        }
      }
    }
    frontier = next;
  }
  return null;
}

/** Rejoue une suite de coups ; renvoie le nombre de coups si la charrette est sortie, sinon null (coup illégal ou pas sortie). */
export function replay(r: Rush, moves: unknown): number | null {
  if (!Array.isArray(moves) || moves.length > 500) return null;
  let cars = r.cars;
  for (const m of moves) {
    if (!m || typeof m !== "object") return null;
    const { car, to } = m as Move;
    if (!Number.isInteger(car) || car < 0 || car >= cars.length || !reach(cars, car).includes(to)) return null;
    cars = moved(cars, { car, to });
  }
  return solved(cars) ? moves.length : null;
}

/** Une grille au hasard : la charrette à gauche sur la ligne de sortie, puis des véhicules posés là où ils tiennent. */
function randomBoard(rand: () => number): Car[] {
  const cars: Car[] = [{ x: Math.floor(rand() * 2), y: EXIT_ROW, len: 2, h: true }];
  const want = 10 + Math.floor(rand() * 4);
  for (let tries = 0; tries < 300 && cars.length < want; tries++) {
    const h = rand() < 0.45, len = (rand() < 0.3 ? 3 : 2) as 2 | 3;
    const c: Car = { h, len, x: Math.floor(rand() * (h ? RN - len + 1 : RN)), y: Math.floor(rand() * (h ? RN : RN - len + 1)) };
    if (h && c.y === EXIT_ROW) continue; // rien d'horizontal devant la charrette (il ne pourrait jamais dégager)
    const g = occupancy(cars);
    if (cellsOf(c).some((k) => g[k] !== -1)) continue;
    cars.push(c);
  }
  return cars;
}

/** La grille du jour : la plus difficile parmi plusieurs tirages (au moins 12 coups si possible). */
export function dailyRush(rand: () => number): { puzzle: Rush; min: number } {
  let best: { puzzle: Rush; min: number } | null = null;
  for (let tries = 0; tries < 150; tries++) {
    const cars = randomBoard(rand);
    const m = minMoves(cars);
    if (m === null || m < 6) continue;
    if (!best || m > best.min) best = { puzzle: { cars }, min: m };
    if (best.min >= 14) break;
  }
  if (!best) throw new Error("Aucun embouteillage trouvé");
  return best;
}
