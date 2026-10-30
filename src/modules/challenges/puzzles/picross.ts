// Picross (logimage) 15 × 15 : noircir les cases d'après les indices des lignes et des colonnes.
// La grille du jour est un motif symétrique (un « dessin » en miroir), gardé seulement s'il se résout ligne par ligne,
// sans jamais deviner. Fonctions pures, testées dans tests/unit/puzzles.test.ts.

export const PX = 15;
export type Picross = { rows: number[][]; cols: number[][] };

/** Indices d'une ligne : longueurs des blocs noirs, dans l'ordre ([0] si la ligne est vide). */
export function cluesOf(line: boolean[]) {
  const out: number[] = [];
  let n = 0;
  for (const c of line) {
    if (c) n++;
    else if (n) { out.push(n); n = 0; }
  }
  if (n) out.push(n);
  return out.length ? out : [0];
}

export const rowsOf = (g: boolean[]) => Array.from({ length: PX }, (_, y) => g.slice(y * PX, y * PX + PX));
export const colsOf = (g: boolean[]) => Array.from({ length: PX }, (_, x) => Array.from({ length: PX }, (_, y) => g[y * PX + x]));
export const puzzleOf = (g: boolean[]): Picross => ({ rows: rowsOf(g).map(cluesOf), cols: colsOf(g).map(cluesOf) });

/**
 * Une ligne déduite : pour chaque case, 1 (noire), 0 (blanche) ou -1 (inconnue), à partir des cases déjà connues.
 * Toutes les façons de placer les blocs compatibles avec ce qu'on sait ; on garde ce qu'elles ont en commun.
 * null : aucune façon possible (contradiction).
 */
export function solveLine(clue: number[], known: number[]): number[] | null {
  const n = known.length, blocks = clue[0] === 0 ? [] : clue;
  const canBlack = Array(n).fill(false), canWhite = Array(n).fill(false);
  let any = false;
  const cur = Array(n).fill(0);
  const fits = (from: number, to: number, v: number) => { for (let i = from; i < to; i++) if (known[i] !== -1 && known[i] !== v) return false; return true; };
  const place = (b: number, pos: number) => {
    if (b === blocks.length) {
      if (!fits(pos, n, 0)) return;
      any = true;
      for (let i = 0; i < n; i++) { if (i < pos ? cur[i] : 0) canBlack[i] = true; else canWhite[i] = true; }
      return;
    }
    const len = blocks[b];
    const rest = blocks.slice(b + 1).reduce((s, x) => s + x + 1, 0);
    for (let s = pos; s + len + rest <= n; s++) {
      if (!fits(pos, s, 0) || !fits(s, s + len, 1)) continue;
      if (s + len < n && known[s + len] === 1) continue;
      for (let i = pos; i < s; i++) cur[i] = 0;
      for (let i = s; i < s + len; i++) cur[i] = 1;
      if (s + len < n) cur[s + len] = 0;
      place(b + 1, Math.min(n, s + len + 1));
    }
  };
  place(0, 0);
  if (!any) return null;
  return known.map((_, i) => (canBlack[i] && !canWhite[i] ? 1 : canWhite[i] && !canBlack[i] ? 0 : -1));
}

/** Résout par déductions ligne à ligne seulement. Renvoie la grille si elle est entièrement trouvée, sinon null. */
export function lineSolve(p: Picross): boolean[] | null {
  const g = Array(PX * PX).fill(-1);
  for (let changed = true, guard = 0; changed && guard < 200; guard++) {
    changed = false;
    for (let y = 0; y < PX; y++) {
      const line = g.slice(y * PX, y * PX + PX), r = solveLine(p.rows[y], line);
      if (!r) return null;
      r.forEach((v, x) => { if (v !== -1 && g[y * PX + x] === -1) { g[y * PX + x] = v; changed = true; } });
    }
    for (let x = 0; x < PX; x++) {
      const line = Array.from({ length: PX }, (_, y) => g[y * PX + x]), r = solveLine(p.cols[x], line);
      if (!r) return null;
      r.forEach((v, y) => { if (v !== -1 && g[y * PX + x] === -1) { g[y * PX + x] = v; changed = true; } });
    }
  }
  return g.every((v) => v !== -1) ? g.map((v) => v === 1) : null;
}

/** Un motif en miroir (gauche-droite) : bruit, puis lissage pour former des taches, comme un dessin à l'encre. */
function motif(rand: () => number): boolean[] {
  const half = Math.ceil(PX / 2);
  let g = Array.from({ length: PX * PX }, (_, i) => {
    const x = i % PX, y = Math.floor(i / PX);
    const cx = Math.min(x, PX - 1 - x), dy = Math.abs(y - PX / 2) / (PX / 2);
    return rand() < 0.5 - dy * 0.2 + (cx / half) * 0.08;
  });
  for (let pass = 0; pass < 1; pass++) {
    g = g.map((v, i) => {
      const x = i % PX, y = Math.floor(i / PX);
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < PX && ny < PX && g[ny * PX + nx]) n++;
      }
      return n >= 5 || (v && n >= 3);
    });
  }
  for (let y = 0; y < PX; y++) for (let x = 0; x < half; x++) g[y * PX + (PX - 1 - x)] = g[y * PX + x];
  return g;
}

/** La grille du jour : premier motif (selon la graine) qui se résout sans deviner et n'est ni presque vide ni presque plein. */
export function dailyPicross(rand: () => number): { solution: boolean[]; puzzle: Picross } {
  for (let tries = 0; tries < 500; tries++) {
    const g = motif(rand), filled = g.filter(Boolean).length;
    if (filled < 70 || filled > 160) continue;
    const p = puzzleOf(g), s = lineSolve(p);
    if (s && s.every((v, i) => v === g[i])) return { solution: g, puzzle: p };
  }
  throw new Error("Aucun picross trouvé");
}

/** Juste si la grille proposée a exactement les mêmes indices (une autre grille aux mêmes indices compte aussi). */
export function checkPicross(p: Picross, guess: unknown) {
  if (!Array.isArray(guess) || guess.length !== PX * PX) return false;
  const g = guess.map(Boolean);
  const q = puzzleOf(g);
  return JSON.stringify(q) === JSON.stringify(p);
}
