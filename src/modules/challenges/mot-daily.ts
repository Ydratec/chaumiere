// Mot du jour : un mot de 5 lettres à trouver en 6 essais (sans accents). Chaque lettre est colorée :
// bien placée, présente ailleurs, ou absente (une lettre en double n'est signalée que autant de fois qu'elle est dans le mot).
// Fonctions pures, testées dans tests/unit/challenges.test.ts.

export const MOT_LEN = 5;
export const MOT_MAX = 6;
export type Mark = "ok" | "near" | "no";
export type MotEntry = { word: string; marks: Mark[] };
export type MotAttempt = { log: MotEntry[]; solved: boolean };

/** Minuscules, sans accents ni espaces : « Crêpe » → « crepe ». */
export const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export function marksOf(answer: string, word: string): Mark[] {
  const marks: Mark[] = Array(MOT_LEN).fill("no");
  const left = new Map<string, number>();
  for (let i = 0; i < MOT_LEN; i++) {
    if (word[i] === answer[i]) marks[i] = "ok";
    else left.set(answer[i], (left.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < MOT_LEN; i++) {
    if (marks[i] === "ok") continue;
    const n = left.get(word[i]) ?? 0;
    if (n > 0) { marks[i] = "near"; left.set(word[i], n - 1); }
  }
  return marks;
}

export const motDone = (a: MotAttempt) => a.solved || a.log.length >= MOT_MAX;

/** Proposer un mot. Erreur lisible si le mot n'est pas accepté. */
export function playMot(answer: string, a: MotAttempt, raw: unknown, valid: (w: string) => boolean): { attempt: MotAttempt } | { error: string } {
  if (motDone(a)) return { error: "Le défi du jour est terminé." };
  const word = normalize(String(raw ?? ""));
  if (word.length !== MOT_LEN) return { error: "Il faut un mot de 5 lettres." };
  if (!valid(word)) return { error: "Ce mot n'est pas dans le dictionnaire." };
  if (a.log.some((e) => e.word === word)) return { error: "Tu as déjà essayé ce mot." };
  const marks = marksOf(answer, word);
  return { attempt: { log: [...a.log, { word, marks }], solved: marks.every((m) => m === "ok") } };
}

/** Pièces : 200 du premier coup, puis 170, 140, 110, 80, 60. Raté : rien. */
export const motReward = (tries: number) => [200, 170, 140, 110, 80, 60][Math.max(0, Math.min(5, tries - 1))];

/** Le mot de la n-ième fois que le défi tombe : la liste est mélangée une fois (graine de la salle), puis parcourue dans l'ordre. */
export function answerAt(list: string[], rand: () => number, n: number) {
  const order = list.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return list[order[((n % list.length) + list.length) % list.length]];
}
