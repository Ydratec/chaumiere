// Classements des jeux (fonctions pures, testées dans tests/unit/standings.test.ts).

export type Played = { type: string; creator: string; opponent: string | null; winner: string | null };
export type Standing = { user: string; played: number; wins: number; losses: number; draws: number; points: number; rate: number };

/**
 * Classement d'un jeu à partir des parties terminées : 3 points la victoire, 1 l'égalité.
 * Tri : points, puis taux de victoire, puis nombre de parties. Un abandon compte comme une défaite.
 */
export function standings(games: Played[], type: string): Standing[] {
  const rows = new Map<string, Standing>();
  const row = (u: string) => rows.get(u) ?? rows.set(u, { user: u, played: 0, wins: 0, losses: 0, draws: 0, points: 0, rate: 0 }).get(u)!;
  for (const g of games) {
    if (g.type !== type || !g.opponent || !g.winner) continue;
    for (const u of [g.creator, g.opponent]) {
      const r = row(u);
      r.played++;
      if (g.winner === "draw") r.draws++;
      else if (g.winner === u) r.wins++;
      else r.losses++;
    }
  }
  return [...rows.values()]
    .map((r) => ({ ...r, points: 3 * r.wins + r.draws, rate: r.played ? r.wins / r.played : 0 }))
    .sort((a, b) => b.points - a.points || b.rate - a.rate || b.played - a.played);
}

export type DailyRow = { user_id: string; day: string; score: number | null; solved_at: string | null };
export type DailyStanding = { user: string; solved: number; best: number; avg: number; days: number }; // days : jours gagnés (meilleur score)

/** Classement du défi du jour : jours remportés (meilleur score du jour, égalité = les deux), défis réussis, score moyen. */
export function dailyStandings(rows: DailyRow[]): DailyStanding[] {
  const solved = rows.filter((r) => r.solved_at && r.score !== null);
  const bestOf = new Map<string, number>();
  for (const r of solved) bestOf.set(r.day, Math.min(bestOf.get(r.day) ?? Infinity, r.score!));
  const by = new Map<string, DailyStanding & { sum: number }>();
  for (const r of solved) {
    const s = by.get(r.user_id) ?? { user: r.user_id, solved: 0, best: Infinity, avg: 0, days: 0, sum: 0 };
    s.solved++;
    s.sum += r.score!;
    s.best = Math.min(s.best, r.score!);
    if (r.score === bestOf.get(r.day)) s.days++;
    by.set(r.user_id, s);
  }
  return [...by.values()]
    .map(({ sum, ...s }) => ({ ...s, avg: Math.round((sum / s.solved) * 10) / 10 }))
    .sort((a, b) => b.days - a.days || b.solved - a.solved || a.avg - b.avg);
}
