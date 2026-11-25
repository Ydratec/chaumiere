// Résultats du quiz en ligne (module pur, testé) : classement de la salle, face-à-face et dernières parties.
// Une partie compte une fois finie (status done) ; le gagnant est le seul premier du classement de la partie
// (à égalité de points en tête : match nul, personne ne gagne).
import { ranking, type MatchPlayer, type Rules } from "./match.ts";

export type DoneMatch = { id: string; rules: Rules; n: number; game: string; cat: string; created_at: string; players: MatchPlayer[] };
export type Standing = { user: string; played: number; wins: number; points: number };
export type HeadToHead = { user: string; w: number; l: number; d: number };
export type Recent = { id: string; at: string; game: string; cat: string; rank: number; of: number; win: boolean; draw: boolean; scores: { user: string; score: number }[] };

/** Gagnant d'une partie (null si égalité en tête ou personne n'a joué). */
export function winnerOf(m: DoneMatch): string | null {
  const r = ranking(m.rules, m.players, m.n).filter((x) => m.players.find((p) => p.user_id === x.user)?.answers.length);
  if (!r.length) return null;
  if (r.length > 1 && (m.rules === "elim" ? r[0].out === r[1].out && r[0].score === r[1].score : r[0].score === r[1].score)) return null;
  return r[0].user;
}

export function onlineStats(matches: DoneMatch[], me: string) {
  const table = new Map<string, Standing>(), h2h = new Map<string, HeadToHead>(), recent: Recent[] = [];
  const sorted = [...matches].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  for (const m of sorted) {
    const playing = m.players.filter((p) => p.answers.length);
    if (playing.length < 2) continue;
    const win = winnerOf(m), rank = ranking(m.rules, m.players, m.n).filter((x) => playing.some((p) => p.user_id === x.user));
    for (const p of playing) {
      const s = table.get(p.user_id) ?? { user: p.user_id, played: 0, wins: 0, points: 0 };
      s.played++; s.points += p.answers.reduce((t, a) => t + a.pts, 0); if (win === p.user_id) s.wins++;
      table.set(p.user_id, s);
    }
    const mine = playing.find((p) => p.user_id === me);
    if (!mine) continue;
    if (playing.length === 2) {
      const op = playing.find((p) => p.user_id !== me)!.user_id, h = h2h.get(op) ?? { user: op, w: 0, l: 0, d: 0 };
      if (!win) h.d++; else if (win === me) h.w++; else h.l++;
      h2h.set(op, h);
    }
    if (recent.length < 10) recent.push({
      id: m.id, at: m.created_at, game: m.game, cat: m.cat, rank: rank.findIndex((x) => x.user === me) + 1, of: rank.length,
      win: win === me, draw: !win, scores: rank.map((x) => ({ user: x.user, score: x.score })),
    });
  }
  const standings = [...table.values()].sort((a, b) => b.wins - a.wins || b.wins / b.played - a.wins / a.played || b.played - a.played || b.points - a.points);
  const duels = [...h2h.values()].sort((a, b) => b.w + b.l + b.d - (a.w + a.l + a.d));
  return { standings, duels, recent };
}
