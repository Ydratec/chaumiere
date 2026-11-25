// Chargement (serveur) des résultats du quiz en ligne d'une salle : parties finies des 6 derniers mois.
import { adminDb } from "@/src/lib/db/server";
import type { MatchPlayer, Rules } from "./match";
import { onlineStats, type DoneMatch } from "./online-stats";

export async function loadOnlineStats(roomId: string, me: string) {
  const db = adminDb();
  const since = new Date(Date.now() - 180 * 86_400_000).toISOString();
  const { data: ms, error } = await db.from("quiz_matches").select("id, rules, n, game, cat, created_at")
    .eq("room_id", roomId).eq("status", "done").gte("created_at", since).order("created_at", { ascending: false }).limit(300);
  if (error || !ms?.length) return onlineStats([], me);
  const { data: ps } = await db.from("quiz_match_players").select("match_id, user_id, answers, left_game").in("match_id", ms.map((m) => m.id));
  const matches: DoneMatch[] = ms.map((m) => ({
    id: m.id, rules: m.rules as Rules, n: m.n, game: m.game, cat: m.cat ?? "", created_at: m.created_at,
    players: (ps ?? []).filter((p) => p.match_id === m.id).map((p): MatchPlayer => ({ user_id: p.user_id, answers: p.answers ?? [], left: p.left_game })),
  }));
  return onlineStats(matches, me);
}
