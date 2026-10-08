// Thèmes des questions achetables (packs « theme:… » de la migration 0019).
export const THEMES = {
  amour: "Amour",
  enfance: "Enfance",
  confidences: "Confidences",
  philo: "Philo",
  absurde: "Absurde",
  gourmand: "Gourmandise",
} as const;
export type Theme = keyof typeof THEMES;
export const isTheme = (t: unknown): t is Theme => typeof t === "string" && Object.hasOwn(THEMES, t);
/** Une question à thème coûte ce multiple du prix d'une question en plus (même calcul en SQL, buy_question). */
export const THEME_FACTOR = 3;

/** Petit titre d'une question : « Question du jour », ou qui l'a achetée (et son thème). */
export function questionLabel(a: { slot?: number; bought_by?: string | null; payload: { theme?: string | null } }, names: Record<string, string>) {
  if (!a.slot) return "Question du jour";
  const who = names[a.bought_by ?? ""] ?? "un ancien membre";
  return `${isTheme(a.payload.theme) ? `Thème ${THEMES[a.payload.theme]}` : "Question en plus"} · de ${who}`;
}
