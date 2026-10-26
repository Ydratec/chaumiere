// Défi Orapa du jour : une grille commune à toute la salle, à trouver en le moins de coups possible (fonctions pures,
// testées dans tests/unit/challenges.test.ts). La graine vient du serveur (secrète) : la grille n'est jamais envoyée avant la fin.
import { generate, isProbeIndex, probeCell, sameGrid, wave, type Grid } from "../games/orapa.ts";

/** Générateur déterministe (mulberry32). */
export function seeded(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** La grille du jour pour cette graine (toujours la même). */
export const dailyGrid = (seed: number): Grid => generate(seeded(seed));

export const MISS_COST = 3; // un essai raté compte comme 3 ondes
export const PROBE_COST = 2; // demander la couleur d'une case compte comme 2 ondes
export type DailyWave = { from: string; to: string | null; colors: string[] };
export type DailyProbe = { probe: number; color: string | null };
export type DailyEntry = DailyWave | DailyProbe;
export type DailyAttempt = { log: DailyEntry[]; misses: number; solved: boolean };
export const isWave = (e: DailyEntry): e is DailyWave => "from" in e;

/** Score : 1 par onde, 2 par case demandée, 3 par essai raté (le plus petit gagne). */
export const scoreOf = (a: { log: DailyEntry[]; misses: number }) =>
  a.log.reduce((n, e) => n + (isWave(e) ? 1 : PROBE_COST), 0) + MISS_COST * a.misses;
/** Pièces gagnées en trouvant : 200 pour un score de 2, puis 10 de moins par point, jamais moins de 30. */
export const rewardOf = (score: number) => Math.max(30, Math.min(200, 220 - 10 * score));

/** Envoyer une onde. null : déjà résolu, repère inconnu ou onde déjà envoyée (elle ne coûte rien de plus). */
export function sendWave(grid: Grid, a: DailyAttempt, from: string): DailyAttempt | null {
  if (a.solved || a.log.some((w) => isWave(w) && w.from === from)) return null;
  try {
    return { ...a, log: [...a.log, { from, ...wave(grid, from) }] };
  } catch {
    return null;
  }
}

/** Demander la couleur d'une case. null : déjà résolu, case inconnue ou déjà demandée. */
export function sendProbe(grid: Grid, a: DailyAttempt, cell: unknown): DailyAttempt | null {
  if (a.solved || !isProbeIndex(cell) || a.log.some((e) => !isWave(e) && e.probe === cell)) return null;
  return { ...a, log: [...a.log, { probe: cell, color: probeCell(grid, cell) }] };
}

/** Tenter une grille : juste = résolu ; faux = un essai raté de plus. */
export function tryGuess(grid: Grid, a: DailyAttempt, guess: unknown): { attempt: DailyAttempt; right: boolean } | null {
  if (a.solved) return null;
  const right = sameGrid(grid, guess);
  return { attempt: right ? { ...a, solved: true } : { ...a, misses: a.misses + 1 }, right };
}
