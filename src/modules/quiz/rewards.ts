// Quiz : pièces gagnées en jouant. Ici, les montants de base ; les limites (une fois par jour, gains décroissants,
// plafonds) sont appliquées par la fonction SQL quiz_grant (migration 0035), en même temps que le crédit des pièces.

export const REWARDS = {
  dailyBase: 300, // défi du jour, première partie de la journée
  dailyBonus: 200, // + jusqu'à 200 selon le score (160 = sans-faute)
  dailyMax: 160,
  streakStep: 50, // + 50 par jour d'affilée de défi déjà joué avant aujourd'hui
  streakMax: 300,
  perGood: 10, // parties solo : par bonne réponse
  decay: [1, 0.5, 0.25], // 1re, 2e, 3e partie du même jeu dans la journée ; ensuite 0
  onlinePlay: 50, // partie en ligne terminée
  onlineWin: 100, // + victoire
  onlinePerDay: 5,
  sameOpponent: 2,
  dayCap: 1500, // hors défi du jour
} as const;

/** Série : nombre de jours d'affilée, jusqu'à hier, où le défi du jour a été joué. `days` au format AAAA-MM-JJ. */
export function streakBefore(days: string[], today: string) {
  const set = new Set(days);
  let n = 0;
  const d = new Date(`${today}T12:00:00Z`);
  for (;;) {
    d.setUTCDate(d.getUTCDate() - 1);
    if (!set.has(d.toISOString().slice(0, 10))) return n;
    n++;
  }
}

/** Défi du jour : base + bonus selon le score + bonus de série. */
export function dailyReward(score: number, streak: number) {
  const s = Math.max(0, Math.min(REWARDS.dailyMax, score));
  return REWARDS.dailyBase + Math.round((REWARDS.dailyBonus * s) / REWARDS.dailyMax) + Math.min(REWARDS.streakMax, REWARDS.streakStep * streak);
}

/** Partie solo : bonnes réponses envoyées par le jeu, bornées (7 en normal ; en survie, le score est la série). */
export function soloGoods(body: unknown, format: string, score: number) {
  if (format === "survie") return Math.max(0, Math.min(score, 200));
  const g = Number((body as Record<string, unknown> | null)?.goods);
  return Number.isInteger(g) ? Math.max(0, Math.min(g, 15)) : 0;
}

/** Partie en ligne : participation + victoire. */
export const onlineReward = (won: boolean) => REWARDS.onlinePlay + (won ? REWARDS.onlineWin : 0);

/** Part de gain qui reste pour un jeu solo déjà joué `plays` fois aujourd'hui (pour l'afficher avant de jouer). */
export const soloShare = (plays: number) => REWARDS.decay[plays] ?? 0;
