// Reines : grille 9 × 9 découpée en 9 zones de couleur. Une reine par ligne, par colonne et par zone,
// et deux reines ne se touchent jamais (même en diagonale). La grille du jour n'a qu'une seule solution.
// Fonctions pures, testées dans tests/unit/puzzles.test.ts.

export const QN = 9;
export type Queens = { regions: number[] }; // zone de chaque case (0 à 8)

/** Toutes les règles sont-elles respectées par ces reines (une liste de cases) ? */
export function validQueens(p: Queens, queens: unknown): boolean {
  if (!Array.isArray(queens) || queens.length !== QN || !queens.every((q) => Number.isInteger(q) && q >= 0 && q < QN * QN)) return false;
  const rows = new Set<number>(), cols = new Set<number>(), regs = new Set<number>();
  for (const q of queens as number[]) { rows.add(Math.floor(q / QN)); cols.add(q % QN); regs.add(p.regions[q]); }
  if (rows.size !== QN || cols.size !== QN || regs.size !== QN) return false;
  const qs = queens as number[];
  for (let a = 0; a < qs.length; a++) for (let b = a + 1; b < qs.length; b++) {
    if (Math.abs(Math.floor(qs[a] / QN) - Math.floor(qs[b] / QN)) <= 1 && Math.abs((qs[a] % QN) - (qs[b] % QN)) <= 1) return false;
  }
  return true;
}

/** Solutions (au plus `stop`), chacune comme liste de cases. Une reine par ligne : on essaie chaque colonne, ligne après ligne. */
export function solveQueens(p: Queens, stop = 2): number[][] {
  const out: number[][] = [], cols: number[] = [];
  const colUsed = Array(QN).fill(false), regUsed = Array(QN).fill(false);
  const go = (y: number) => {
    if (out.length >= stop) return;
    if (y === QN) { out.push(cols.map((x, yy) => yy * QN + x)); return; }
    for (let x = 0; x < QN; x++) {
      const r = p.regions[y * QN + x];
      if (colUsed[x] || regUsed[r] || (y > 0 && Math.abs(cols[y - 1] - x) <= 1)) continue;
      colUsed[x] = regUsed[r] = true; cols.push(x);
      go(y + 1);
      colUsed[x] = regUsed[r] = false; cols.pop();
    }
  };
  go(0);
  return out;
}
export const countQueens = (p: Queens, stop = 2) => solveQueens(p, stop).length;

/** Une solution au hasard : une reine par ligne, colonnes toutes différentes, jamais deux reines voisines. */
function randomQueens(rand: () => number): number[] | null {
  const cols: number[] = [];
  const go = (y: number): boolean => {
    if (y === QN) return true;
    const order = Array.from({ length: QN }, (_, i) => i).sort(() => rand() - 0.5);
    for (const x of order) {
      if (cols.includes(x) || (y > 0 && Math.abs(cols[y - 1] - x) <= 1)) continue;
      cols.push(x);
      if (go(y + 1)) return true;
      cols.pop();
    }
    return false;
  };
  return go(0) ? cols.map((x, y) => y * QN + x) : null;
}

/** Les zones poussent depuis chaque reine, au hasard, jusqu'à couvrir la grille. */
function growRegions(queens: number[], rand: () => number): number[] {
  const reg = Array(QN * QN).fill(-1);
  queens.forEach((q, i) => (reg[q] = i));
  let left = QN * QN - QN;
  while (left > 0) {
    const frontier: [number, number][] = [];
    for (let c = 0; c < QN * QN; c++) {
      if (reg[c] !== -1) continue;
      const x = c % QN, y = Math.floor(c / QN);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < QN && ny < QN && reg[ny * QN + nx] !== -1) frontier.push([c, reg[ny * QN + nx]]);
      }
    }
    const [c, r] = frontier[Math.floor(rand() * frontier.length)];
    reg[c] = r;
    left--;
  }
  return reg;
}

/** La zone reste-t-elle d'un seul tenant si on lui retire cette case ? */
function staysConnected(reg: number[], cell: number) {
  const r = reg[cell], cells = reg.map((v, i) => (v === r && i !== cell ? i : -1)).filter((i) => i >= 0);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]), stack = [cells[0]];
  while (stack.length) {
    const c = stack.pop()!, x = c % QN, y = Math.floor(c / QN);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = ny * QN + nx;
      if (nx >= 0 && ny >= 0 && nx < QN && ny < QN && n !== cell && reg[n] === r && !seen.has(n)) { seen.add(n); stack.push(n); }
    }
  }
  return seen.size === cells.length;
}

/**
 * La grille du jour : des zones qui poussent depuis une solution tirée au hasard, puis retouchées tant qu'une autre
 * solution existe (une case de l'autre solution change de zone), jusqu'à n'en laisser qu'une.
 */
export function dailyQueens(rand: () => number): { puzzle: Queens; solution: number[] } {
  for (let tries = 0; tries < 200; tries++) {
    const q = randomQueens(rand);
    if (!q) continue;
    const reg = growRegions(q, rand), mine = new Set(q);
    for (let it = 0; it < 300; it++) {
      const sols = solveQueens({ regions: reg }, 2);
      if (sols.length === 1) return { puzzle: { regions: reg }, solution: q };
      const alt = sols.find((s) => s.some((c) => !mine.has(c)))!;
      const cands = alt.filter((c) => !mine.has(c));
      const c = cands[Math.floor(rand() * cands.length)];
      const x = c % QN, y = Math.floor(c / QN);
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < QN && ny < QN).map(([nx, ny]) => reg[ny * QN + nx]).filter((r) => r !== reg[c]);
      if (!near.length || !staysConnected(reg, c)) continue;
      reg[c] = near[Math.floor(rand() * near.length)];
    }
  }
  throw new Error("Aucune grille de reines trouvée");
}
