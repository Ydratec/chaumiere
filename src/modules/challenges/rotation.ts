// Défi du jour : un jeu différent chaque jour, le même pour toute la salle (fonctions pures, testées dans tests/unit/challenges.test.ts).
// La rotation part du 30 octobre 2026 (Orapa) : Orapa, Picross, Embouteillage, Reines, Le compte est bon, Hashi, et on recommence.
// Code secret et Mot du jour existent aussi mais sont hors rotation (des jeux plus rapides, à garder pour des week-ends).

export type ChallengeKind = "orapa" | "picross" | "rush" | "queens" | "compte" | "hashi" | "code" | "mot";
export const ROTATION: ChallengeKind[] = ["orapa", "picross", "rush", "queens", "compte", "hashi"];
const START = "2026-10-30";

/** Durée lisible : « 4 min 05 », « 1 h 02 ». */
export const duration = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}`);
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;

export const CHALLENGES: Record<ChallengeKind, { name: string; icon: string; pitch: string; unit: (n: number) => string }> = {
  orapa: { name: "Orapa Mine : la grille commune", icon: "💎", pitch: "Retrouve les gemmes cachées avec le moins d'ondes possible.", unit: (n) => plural(n, "coup") },
  picross: { name: "Picross", icon: "🧩", pitch: "Noircis les cases d'après les nombres : un dessin apparaît.", unit: duration },
  rush: { name: "Embouteillage", icon: "🚗", pitch: "Sors la charrette du marché en déplaçant les autres véhicules.", unit: (n) => plural(n, "coup") },
  queens: { name: "Reines", icon: "👑", pitch: "Une reine par ligne, par colonne et par couleur, sans qu'elles se touchent.", unit: duration },
  compte: { name: "Le compte est bon", icon: "🔢", pitch: "Atteins le nombre avec les 6 plaques et les 4 opérations.", unit: (n) => (Math.floor(n / 10) === 0 ? `exact en ${plural(n % 10, "étape")}` : `à ${Math.floor(n / 10)} près`) },
  hashi: { name: "Hashi", icon: "🌉", pitch: "Relie toutes les îles avec le bon nombre de ponts, sans croisement.", unit: duration },
  code: { name: "Code secret", icon: "🔐", pitch: "Trouve les 4 couleurs cachées, dans l'ordre, en 10 essais au plus.", unit: (n) => plural(n, "essai") },
  mot: { name: "Mot du jour", icon: "🔤", pitch: "Trouve le mot de 5 lettres en 6 essais au plus.", unit: (n) => plural(n, "essai") },
};

/** Numéro du jour depuis le début de la rotation (0 le 30 octobre 2026). */
export const dayIndex = (day: string) => Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${START}T12:00:00Z`)) / 86_400_000);
const listFor = (orapa: boolean) => (orapa ? ROTATION : ROTATION.filter((k) => k !== "orapa"));

/** Le défi de ce jour. Sans Orapa débloqué dans la salle, les autres tournent sans lui. */
export function kindOf(day: string, orapa = true): ChallengeKind {
  const list = listFor(orapa), i = dayIndex(day);
  return list[((i % list.length) + list.length) % list.length];
}

/** Combien de tours de rotation avant ce jour (pour le Mot du jour : ne pas reprendre un mot avant la fin de la liste). */
export const occurrence = (day: string, orapa = true) => Math.floor(dayIndex(day) / listFor(orapa).length);
