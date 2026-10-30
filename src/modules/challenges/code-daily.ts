// Code secret du jour (Mastermind) : 4 pions parmi 6 couleurs (une couleur peut revenir), 10 essais au plus.
// Chaque essai indique combien de couleurs sont bien placées et combien sont présentes mais mal placées.
// Fonctions pures, testées dans tests/unit/challenges.test.ts.

export const PEGS = ["rouge", "jaune", "vert", "bleu", "violet", "orange"] as const;
export type Peg = (typeof PEGS)[number];
export const PEG_HEX: Record<Peg, string> = { rouge: "#ef4444", jaune: "#facc15", vert: "#22c55e", bleu: "#3b82f6", violet: "#a855f7", orange: "#f97316" };
export const CODE_LEN = 4;
export const CODE_MAX = 10;

export type CodeEntry = { guess: Peg[]; good: number; near: number };
export type CodeAttempt = { log: CodeEntry[]; solved: boolean };

export const isPeg = (p: unknown): p is Peg => typeof p === "string" && (PEGS as readonly string[]).includes(p);

/** Le code du jour, tiré d'un générateur déterministe. */
export const secretCode = (rand: () => number): Peg[] => Array.from({ length: CODE_LEN }, () => PEGS[Math.floor(rand() * PEGS.length)]);

/** Bien placés, puis présents mais mal placés (chaque pion du code ne compte qu'une fois). */
export function score(secret: Peg[], guess: Peg[]) {
  let good = 0;
  const left = new Map<Peg, number>(), rest: Peg[] = [];
  secret.forEach((p, i) => {
    if (guess[i] === p) good++;
    else { left.set(p, (left.get(p) ?? 0) + 1); rest.push(guess[i]); }
  });
  let near = 0;
  for (const g of rest) if ((left.get(g) ?? 0) > 0) { near++; left.set(g, left.get(g)! - 1); }
  return { good, near };
}

export const codeDone = (a: CodeAttempt) => a.solved || a.log.length >= CODE_MAX;

/** Proposer un code. null : défi fini, ou proposition invalide. */
export function playCode(secret: Peg[], a: CodeAttempt, guess: unknown): CodeAttempt | null {
  if (codeDone(a) || !Array.isArray(guess) || guess.length !== CODE_LEN || !guess.every(isPeg)) return null;
  const s = score(secret, guess);
  return { log: [...a.log, { guess, ...s }], solved: s.good === CODE_LEN };
}

/** Pièces : 200 en 1 ou 2 essais, puis 25 de moins par essai, jamais moins de 30. Raté : rien. */
export const codeReward = (tries: number) => Math.max(30, Math.min(200, 230 - 25 * tries));
