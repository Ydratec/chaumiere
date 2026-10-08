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
/** Un pack à thème : PACK_SIZE questions, une par jour, pour PACK_FACTOR fois le prix d'une question en plus (comme buy_question en SQL). */
export const PACK_SIZE = 7;
export const PACK_FACTOR = 5;

/** Petit titre d'une question : « Question du jour », ou qui l'a achetée (et son thème). */
export function questionLabel(a: { slot?: number; bought_by?: string | null; payload: { theme?: string | null; n?: number } }, names: Record<string, string>) {
  if (!a.slot) return "Question du jour";
  const who = names[a.bought_by ?? ""] ?? "un ancien membre";
  return `${isTheme(a.payload.theme) ? `Pack ${THEMES[a.payload.theme]} · jour ${a.payload.n ?? 1}/${PACK_SIZE}` : "Question en plus"} · de ${who}`;
}
