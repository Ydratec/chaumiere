// Défi Orapa du jour : une grille commune à toute la salle, à trouver en le moins de coups possible (fonctions pures,
// testées dans tests/unit/challenges.test.ts). La graine vient du serveur (secrète) : la grille n'est jamais envoyée avant la fin.
import { generate, sameGrid, wave, type Grid } from "../games/orapa.ts";

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
export type DailyWave = { from: string; to: string | null; colors: string[] };
export type DailyAttempt = { log: DailyWave[]; misses: number; solved: boolean };

/** Score : nombre d'ondes, plus 3 par essai raté (le plus petit gagne). */
export const scoreOf = (a: { log: unknown[]; misses: number }) => a.log.length + MISS_COST * a.misses;
/** Pièces gagnées en trouvant : 200 pour un score de 2, puis 10 de moins par point, jamais moins de 30. */
export const rewardOf = (score: number) => Math.max(30, Math.min(200, 220 - 10 * score));

/** Envoyer une onde. null : déjà résolu, repère inconnu ou onde déjà envoyée (elle ne coûte rien de plus). */
export function sendWave(grid: Grid, a: DailyAttempt, from: string): DailyAttempt | null {
  if (a.solved || a.log.some((w) => w.from === from)) return null;
  try {
    return { ...a, log: [...a.log, { from, ...wave(grid, from) }] };
  } catch {
    return null;
  }
}

/** Tenter une grille : juste = résolu ; faux = un essai raté de plus. */
export function tryGuess(grid: Grid, a: DailyAttempt, guess: unknown): { attempt: DailyAttempt; right: boolean } | null {
  if (a.solved) return null;
  const right = sameGrid(grid, guess);
  return { attempt: right ? { ...a, solved: true } : { ...a, misses: a.misses + 1 }, right };
}
