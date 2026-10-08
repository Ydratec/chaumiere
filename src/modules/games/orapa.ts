// Orapa Mine (version numérique) : des gemmes sont cachées sur une grille de 8 colonnes × 10 lignes.
// On envoie une onde depuis un bord ; elle fait demi-tour sur les côtés droits, tourne à 90° sur
// les côtés en diagonale, prend la couleur de chaque gemme touchée (les couleurs se mélangent),
// et ressort ailleurs. La gemme transparente dévie sans colorer ; la noire absorbe l'onde.
// Jeu de gemmes du jeu original (voir aussi github.com/TheApo/orapa, source d'inspiration visuelle).

import type { Base } from "./labels.ts";

export const W = 8;
export const H = 10;

export type Shape = "sq" | "nw" | "ne" | "sw" | "se"; // carré, ou triangle plein dans ce coin
export type Color = "red" | "yellow" | "blue" | "white" | "clear" | "black";
export type Cell = { s: Shape; c: Color } | null;
export type Grid = Cell[]; // W×H, ligne par ligne
type PieceCell = [x: number, y: number, s: Shape];

const TINTS: Color[] = ["red", "yellow", "blue", "white"]; // les seules qui colorent l'onde

export const PIECES: { name: string; color: Color; cells: PieceCell[] }[] = [
  { name: "Triangle jaune", color: "yellow", cells: [[0, 0, "sw"], [0, 1, "sq"], [1, 1, "sw"]] },
  { name: "Parallélogramme rouge", color: "red", cells: [[0, 0, "se"], [1, 0, "sq"], [2, 0, "nw"]] },
  { name: "Grand triangle bleu", color: "blue", cells: [[1, 0, "se"], [2, 0, "sw"], [0, 1, "se"], [1, 1, "sq"], [2, 1, "sq"], [3, 1, "sw"]] },
  { name: "Grand triangle blanc", color: "white", cells: [[1, 0, "se"], [2, 0, "sw"], [0, 1, "se"], [1, 1, "sq"], [2, 1, "sq"], [3, 1, "sw"]] },
  { name: "Losange blanc", color: "white", cells: [[0, 0, "se"], [1, 0, "sw"], [0, 1, "ne"], [1, 1, "nw"]] },
  { name: "Triangle transparent", color: "clear", cells: [[0, 0, "se"], [1, 0, "sw"]] },
  { name: "Bloc noir", color: "black", cells: [[0, 0, "sq"], [1, 0, "sq"]] },
];

/** Couleur et nom d'une onde selon les gemmes touchées (mélange façon peinture). */
export function mix(colors: Color[]): { hex: string; name: string } {
  const key = TINTS.filter((c) => colors.includes(c)).join("+");
  return MIX[key] ?? { hex: "#95a5a6", name: "sans couleur" };
}
const MIX: Record<string, { hex: string; name: string }> = {
  red: { hex: "#e74c3c", name: "rouge" },
  yellow: { hex: "#f1c40f", name: "jaune" },
  blue: { hex: "#3498db", name: "bleu" },
  white: { hex: "#ecf0f1", name: "blanc" },
  "red+blue": { hex: "#9b59b6", name: "violet" },
  "blue+white": { hex: "#85c1e9", name: "bleu ciel" },
  "yellow+blue": { hex: "#2ecc71", name: "vert" },
  "red+white": { hex: "#ff8a80", name: "rose" },
  "red+yellow": { hex: "#e67e22", name: "orange" },
  "yellow+white": { hex: "#fff59d", name: "jaune clair" },
  "red+blue+white": { hex: "#ce93d8", name: "lilas" },
  "red+yellow+blue": { hex: "#34495e", name: "gris foncé" },
  "yellow+blue+white": { hex: "#a5d6a7", name: "vert clair" },
  "red+yellow+white": { hex: "#ffcc80", name: "orange clair" },
  "red+yellow+blue+white": { hex: "#9e9e9e", name: "gris" },
};

type Side = "N" | "S" | "W" | "E";
/** Les 36 entrées/sorties : Haut H1-H8, Bas B1-B8, Gauche G1-G10, Droite D1-D10. */
export const EDGES: { id: string; side: Side; i: number }[] = [
  ...Array.from({ length: W }, (_, i) => ({ id: `H${i + 1}`, side: "N" as Side, i })),
  ...Array.from({ length: W }, (_, i) => ({ id: `B${i + 1}`, side: "S" as Side, i })),
  ...Array.from({ length: H }, (_, i) => ({ id: `G${i + 1}`, side: "W" as Side, i })),
  ...Array.from({ length: H }, (_, i) => ({ id: `D${i + 1}`, side: "E" as Side, i })),
];
const edgeAt = (side: Side, i: number) => EDGES.find((e) => e.side === side && e.i === i)!.id;

const ROT: Record<Shape, Shape> = { sq: "sq", sw: "nw", nw: "ne", ne: "se", se: "sw" }; // quart de tour horaire
const LEGS: Record<Shape, Side[]> = { sq: ["N", "S", "W", "E"], sw: ["S", "W"], se: ["S", "E"], nw: ["N", "W"], ne: ["N", "E"] };

export function rotate(cells: PieceCell[]): PieceCell[] {
  const r = cells.map(([x, y, s]): PieceCell => [-y, x, ROT[s]]);
  const mx = Math.min(...r.map((c) => c[0])), my = Math.min(...r.map((c) => c[1]));
  return r.map(([x, y, s]) => [x - mx, y - my, s]);
}

/** Cases de la gemme n°k tournée `rot` quarts de tour, coin haut-gauche en (ox, oy). */
export function pieceCells(k: number, rot: number, ox = 0, oy = 0): PieceCell[] {
  let cells = PIECES[k].cells;
  for (let r = 0; r < rot % 4; r++) cells = rotate(cells);
  return cells.map(([x, y, s]) => [x + ox, y + oy, s]);
}

/** Place toutes les gemmes au hasard (tournées), sans chevauchement ni contact par un côté. */
export function generate(rand = Math.random): Grid {
  for (;;) {
    const grid: Grid = Array(W * H).fill(null);
    let ok = true;
    for (const p of PIECES) {
      let placed = false;
      for (let t = 0; t < 200 && !placed; t++) {
        let cells = p.cells;
        for (let k = Math.floor(rand() * 4); k > 0; k--) cells = rotate(cells);
        const mw = Math.max(...cells.map((c) => c[0])) + 1, mh = Math.max(...cells.map((c) => c[1])) + 1;
        const ox = Math.floor(rand() * (W - mw + 1)), oy = Math.floor(rand() * (H - mh + 1));
        const abs = cells.map(([x, y, s]): PieceCell => [x + ox, y + oy, s]);
        const touches = abs.some(([x, y]) =>
          [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
            const xx = x + dx, yy = y + dy;
            return xx >= 0 && yy >= 0 && xx < W && yy < H && grid[yy * W + xx];
          }),
        );
        if (touches) continue;
        abs.forEach(([x, y, s]) => (grid[y * W + x] = { s, c: p.color }));
        placed = true;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return grid;
  }
}

/**
 * Trajet d'une onde entrée par `from` : sortie (`to`, null si absorbée), gemmes colorantes touchées,
 * et tracé (`path`, points en coordonnées de case ; le bord de la grille est en -1 et W/H).
 */
export function trace(grid: Grid, from: string) {
  const e = EDGES.find((x) => x.id === from);
  if (!e) throw new Error("entrée inconnue");
  let [x, y, dx, dy] =
    e.side === "N" ? [e.i, -1, 0, 1] : e.side === "S" ? [e.i, H, 0, -1] : e.side === "W" ? [-1, e.i, 1, 0] : [W, e.i, -1, 0];
  const seen = new Set<Color>();
  const path: [number, number][] = [[x, y]];
  const done = (to: string | null) => ({ to, colors: TINTS.filter((c) => seen.has(c)), path });

  for (let step = 0; step < 1000; step++) {
    const nx = x + dx, ny = y + dy;
    const out = nx < 0 ? "W" : nx >= W ? "E" : ny < 0 ? "N" : ny >= H ? "S" : null;
    if (out) {
      path.push([nx, ny]);
      return done(edgeAt(out, out === "W" || out === "E" ? ny : nx));
    }
    const cell = grid[ny * W + nx];
    if (!cell) { x = nx; y = ny; path.push([x, y]); continue; }
    if (cell.c === "black") { path.push([x + dx / 2, y + dy / 2]); return done(null); }
    seen.add(cell.c);
    const entry: Side = dx === 1 ? "W" : dx === -1 ? "E" : dy === 1 ? "N" : "S";
    if (LEGS[cell.s].includes(entry)) { // côté droit : demi-tour
      path.push([x + dx / 2, y + dy / 2], [x, y]);
      dx = -dx; dy = -dy;
      continue;
    }
    [dx, dy] = cell.s === "sw" || cell.s === "ne" ? [dy, dx] : [-dy, -dx]; // diagonale : quart de tour
    x = nx; y = ny;
    path.push([x, y]);
  }
  return done(null);
}

/** Résultat d'une onde, sans le tracé (c'est ce qui est enregistré dans la partie). */
export function wave(grid: Grid, from: string): { to: string | null; colors: Color[] } {
  const { to, colors } = trace(grid, from);
  return { to, colors };
}

export type Placement = { x: number; y: number; rot: number };

// ---------- Placement des gemmes (éditeur) ----------

/** Taille (largeur, hauteur) de la gemme k tournée `rot` fois. */
export function pieceSize(k: number, rot: number) {
  const cells = pieceCells(k, rot);
  return { w: Math.max(...cells.map((c) => c[0])) + 1, h: Math.max(...cells.map((c) => c[1])) + 1 };
}

const clampTo = (v: number, max: number) => Math.max(0, Math.min(max, v));

/** Coin haut-gauche pour que la gemme soit centrée sur la case (cx, cy), recalée dans le plateau. */
export function centerAt(k: number, rot: number, cx: number, cy: number): Placement {
  const { w, h } = pieceSize(k, rot);
  return { x: clampTo(cx - Math.floor((w - 1) / 2), W - w), y: clampTo(cy - Math.floor((h - 1) / 2), H - h), rot };
}

/** Quart de tour en gardant (à peu près) le même centre, recalé dans le plateau. */
export function rotateInPlace(k: number, p: Placement): Placement {
  const { w, h } = pieceSize(k, p.rot);
  const rot = (p.rot + 1) % 4;
  return centerAt(k, rot, p.x + Math.floor((w - 1) / 2), p.y + Math.floor((h - 1) / 2));
}

/**
 * Pourquoi la gemme k ne peut pas aller en `p` parmi les autres gemmes posées (null = possible).
 * `placed[i]` : position de la gemme i, ou null si elle est dans la réserve. Le contact est permis
 * pendant l'édition ; seule la grille finale (buildGrid) l'interdit.
 */
export function placementError(placed: (Placement | null)[], k: number, p: Placement) {
  const taken = new Set<number>();
  placed.forEach((q, i) => {
    if (q && i !== k) pieceCells(i, q.rot, q.x, q.y).forEach(([x, y]) => taken.add(y * W + x));
  });
  for (const [x, y] of pieceCells(k, p.rot, p.x, p.y)) {
    if (x < 0 || y < 0 || x >= W || y >= H) return "Hors du plateau.";
    if (taken.has(y * W + x)) return "Une autre gemme est déjà là.";
  }
  return null;
}

/**
 * Grille formée des 5 gemmes (dans l'ordre de PIECES), ou null si une gemme sort de la grille,
 * en chevauche une autre ou la touche par un côté.
 */
export function buildGrid(placements: unknown): Grid | null {
  if (!Array.isArray(placements) || placements.length !== PIECES.length) return null;
  const grid: Grid = Array(W * H).fill(null);
  const owner: number[] = Array(W * H).fill(-1);
  for (const [k, p] of placements.entries()) {
    const { x, y, rot } = (p ?? {}) as Partial<Placement>;
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(rot)) return null;
    for (const [cx, cy, sh] of pieceCells(k, rot!, x!, y!)) {
      if (cx < 0 || cy < 0 || cx >= W || cy >= H || owner[cy * W + cx] >= 0) return null;
      owner[cy * W + cx] = k;
      grid[cy * W + cx] = { s: sh, c: PIECES[k].color };
    }
  }
  for (let i = 0; i < W * H; i++) {
    const o = owner[i];
    if (o < 0) continue;
    const right = i % W < W - 1 ? owner[i + 1] : -1, below = i + W < W * H ? owner[i + W] : -1;
    if ((right >= 0 && right !== o) || (below >= 0 && below !== o)) return null;
  }
  return grid;
}

export type LogEntry = { by: string; from: string; to: string | null; colors: Color[] } | { by: string; guess: true };
export type OrapaState = Base & {
  phase: "setup" | "play"; // setup : chacun compose sa grille en secret
  players: string[];
  ready: string[];
  log: LogEntry[]; // ondes et essais de chaque joueur, toujours dans la grille de l'adversaire
  solutions: Record<string, Grid> | null; // révélées en fin de partie
};
export type Secrets = Record<string, Grid>; // grille de chaque joueur

export function start(a: string, b: string, rand = Math.random) {
  const state: OrapaState = { turn: rand() < 0.5 ? a : b, winner: null, phase: "setup", players: [a, b], ready: [], log: [], solutions: null };
  return { state, secret: {} as Secrets };
}

function sameGrid(a: Grid, b: unknown) {
  return Array.isArray(b) && b.length === a.length &&
    a.every((c, i) => {
      const d = b[i] as Cell;
      return c ? !!d && d.s === c.s && d.c === c.c : !d;
    });
}

/**
 * Coups :
 * - { kind: "setup", placements } : poser sa grille secrète (une fois, pendant la préparation) ;
 * - { kind: "wave", from } : à son tour, envoyer une onde dans la grille adverse (le tour passe) ;
 * - { kind: "guess", grid } : à tout moment, vérifier sa déduction (ne fait pas passer le tour).
 * `secretPatch` : la part du secret à fusionner (la grille du joueur qui vient de la poser).
 */
export function play(state: OrapaState, secrets: Secrets, move: unknown, player: string): { state: OrapaState; secretPatch?: Secrets } | null {
  const m = move as { kind?: unknown; from?: unknown; grid?: unknown; placements?: unknown } | null;
  if (state.winner || !state.players.includes(player)) return null;
  const other = state.players.find((p) => p !== player)!;

  if (m?.kind === "setup") {
    const grid = buildGrid(m.placements);
    if (state.phase !== "setup" || state.ready.includes(player) || !grid) return null;
    const ready = [...state.ready, player];
    return { state: { ...state, ready, phase: ready.length === 2 ? "play" : "setup" }, secretPatch: { [player]: grid } };
  }

  const target = secrets[other];
  if (state.phase !== "play" || !target) return null;
  if (m?.kind === "wave") {
    if (state.turn !== player) return null;
    const from = String(m.from);
    if (!EDGES.some((e) => e.id === from)) return null;
    return { state: { ...state, log: [...state.log, { by: player, from, ...wave(target, from) }], turn: other } };
  }
  if (m?.kind === "guess") {
    if (sameGrid(target, m.grid)) return { state: { ...state, winner: player, solutions: secrets } };
    return { state: { ...state, log: [...state.log, { by: player, guess: true }] } };
  }
  return null;
}
