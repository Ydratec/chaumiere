// Rattrapage : aide ceux qui sont en retard et freine un peu ceux qui sont très en avance, sans jamais bloquer personne.
// On se compare à la médiane des autres joueurs ACTIFS : un ami qui a arrêté de jouer ne compte pas.

export type CatchUp = {
  speed: number; // × durée des recettes (0,75 = 25 % plus vite)
  reward: number; // × pièces des commandes
  cost: number; // × quantités à livrer pour les quêtes
  gap: number; // mes quêtes − médiane des actifs (négatif : en retard)
};

export const NEUTRAL: CatchUp = { speed: 1, reward: 1, cost: 1, gap: 0 };
export const ACTIVE_DAYS = 7;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** `mine` : mes quêtes finies ; `peers` : celles des AUTRES joueurs actifs. Effet nul sans comparaison, progressif avec l'écart. */
export function catchUp(mine: number, peers: number[]): CatchUp {
  if (!peers.length) return NEUTRAL;
  const gap = mine - median(peers);
  if (gap <= -3) {
    const s = clamp((-gap - 2) / 4, 0, 1); // 0,25 à 3 de retard, 1 à 6
    return { speed: 1 - 0.25 * s, reward: 1 + 0.3 * s, cost: 1 - 0.25 * s, gap };
  }
  if (gap >= 3) {
    const s = clamp((gap - 2) / 4, 0, 1);
    return { speed: 1, reward: 1 - 0.2 * s, cost: 1 + 0.5 * s, gap };
  }
  return { ...NEUTRAL, gap };
}

/** Phrase affichée au joueur (null si rien de particulier). */
export function catchUpNote(c: CatchUp) {
  if (c.speed < 1) return `Le hameau te donne un coup de main : cultures ${Math.round((1 - c.speed) * 100)} % plus rapides, commandes mieux payées, quêtes plus légères.`;
  if (c.cost > 1) return "Le brouillard s'épaissit un peu pour toi, qui as de l'avance : les quêtes demandent un peu plus et les commandes paient un peu moins.";
  return null;
}
