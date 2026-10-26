// Aides pour écrire des quêtes avec des scènes (sans dépendance React : importable par les chapitres et les tests).
import type { Line, Quest, Step } from "./types.ts";

/** Les répliques d'une scène, dans l'ordre (pour l'onglet Histoire, les portraits, les tests). */
export const linesOf = (steps: Step[]): Line[] => steps.flatMap((s) => (s.do === "say" ? [{ who: s.who, text: s.text }] : []));

/** Quête racontée par des scènes : ses répliques `intro` / `outro` sont tirées des scènes. */
export const sceneQuest = (q: Omit<Quest, "intro" | "outro"> & { scenes: NonNullable<Quest["scenes"]> }): Quest => ({
  ...q,
  intro: linesOf(q.scenes.intro),
  outro: linesOf(q.scenes.outro),
});
