// Défi du jour : un jeu différent chaque jour, le même pour toute la salle (fonctions pures, testées dans tests/unit/challenges.test.ts).
// La rotation part du 30 octobre 2026 (Orapa), puis Code secret, puis Mot du jour, et on recommence.

export type ChallengeKind = "orapa" | "code" | "mot";
export const ROTATION: ChallengeKind[] = ["orapa", "code", "mot"];
const START = "2026-10-30";

export const CHALLENGES: Record<ChallengeKind, { name: string; icon: string; pitch: string; unit: (n: number) => string }> = {
  orapa: { name: "Orapa Mine : la grille commune", icon: "💎", pitch: "Retrouve les gemmes cachées avec le moins d'ondes possible.", unit: (n) => `${n} coup${n > 1 ? "s" : ""}` },
  code: { name: "Code secret", icon: "🔐", pitch: "Trouve les 4 couleurs cachées, dans l'ordre, en 10 essais au plus.", unit: (n) => `${n} essai${n > 1 ? "s" : ""}` },
  mot: { name: "Mot du jour", icon: "🔤", pitch: "Trouve le mot de 5 lettres en 6 essais au plus.", unit: (n) => `${n} essai${n > 1 ? "s" : ""}` },
};

/** Numéro du jour depuis le début de la rotation (0 le 30 octobre 2026). */
export const dayIndex = (day: string) => Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${START}T12:00:00Z`)) / 86_400_000);

/** Le défi de ce jour. Sans Orapa débloqué dans la salle, on alterne seulement les deux autres. */
export function kindOf(day: string, orapa = true): ChallengeKind {
  const i = dayIndex(day);
  const list = orapa ? ROTATION : ROTATION.filter((k) => k !== "orapa");
  return list[((i % list.length) + list.length) % list.length];
}

/** Combien de fois ce défi est déjà tombé avant ce jour (pour ne pas reprendre le même mot avant d'avoir tout fait). */
export function occurrence(day: string, orapa = true) {
  const n = orapa ? ROTATION.length : ROTATION.length - 1;
  return Math.floor(dayIndex(day) / n); // chaque défi tombe une fois par tour de rotation
}
