// Préférences de notification de chacun (pas de ligne en base = tout activé).
import type { Kind } from "./push";

/** Un interrupteur par type, plus « room » (ce qui se passe dans la salle) et « quiet » (heures calmes 22 h – 8 h). */
export type Prefs = Record<Kind, boolean> & { room: boolean; quiet: boolean };
export const ALL_ON: Prefs = { question: true, games: true, chat: true, farm: true, quiz: true, room: true, quiet: true };
