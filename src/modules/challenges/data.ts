// Défi du jour côté serveur (pas une server action) : graine secrète, chargement des essais et du classement.
import { createHash } from "node:crypto";
import { adminDb } from "@/src/lib/db/server";
import { paris } from "@/src/modules/questions/day";
import type { Grid } from "../games/orapa";
import { dailyGrid, scoreOf, type DailyAttempt, type DailyWave } from "./orapa-daily";

/** Jour du défi (Paris) : il change à minuit. */
export const challengeDay = (at = new Date()) => paris(at).date;
const yesterdayOf = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Graine de la grille : secrète (le poivre du serveur), propre à la salle et au jour. */
function seedOf(roomId: string, day: string) {
  const h = createHash("sha256").update(`${process.env.AUTH_PEPPER ?? ""}:orapa:${roomId}:${day}`).digest();
  return h.readInt32LE(0);
}
export const gridOf = (roomId: string, day: string): Grid => dailyGrid(seedOf(roomId, day));

type Row = { user_id: string; log: DailyWave[]; misses: number; solved_at: string | null; score: number | null; reward: number | null };

export async function loadAttempt(roomId: string, uid: string, day = challengeDay()): Promise<DailyAttempt> {
  const { data } = await adminDb().from("daily_challenges").select("log, misses, solved_at")
    .eq("room_id", roomId).eq("user_id", uid).eq("day", day).eq("kind", "orapa").maybeSingle();
  return { log: (data?.log as DailyWave[]) ?? [], misses: data?.misses ?? 0, solved: !!data?.solved_at };
}

export type Ranking = { user: string; solved: boolean; score: number; waves: number; misses: number; at: string | null }[];

/** Classement d'un jour : ceux qui ont trouvé (meilleur score, puis le plus tôt), puis ceux qui cherchent encore. */
async function ranking(roomId: string, day: string): Promise<Ranking> {
  const { data } = await adminDb().from("daily_challenges").select("user_id, log, misses, solved_at, score, reward")
    .eq("room_id", roomId).eq("day", day).eq("kind", "orapa");
  return ((data ?? []) as Row[])
    .map((r) => ({ user: r.user_id, solved: !!r.solved_at, score: r.score ?? scoreOf(r), waves: r.log.length, misses: r.misses, at: r.solved_at }))
    .sort((a, b) => Number(b.solved) - Number(a.solved) || (a.solved ? a.score - b.score || Date.parse(a.at!) - Date.parse(b.at!) : 0));
}

export type DailyView = {
  day: string;
  attempt: DailyAttempt & { score: number; reward: number | null };
  solution: Grid | null; // seulement une fois trouvée
  today: Ranking;
  yesterday: Ranking;
};

export async function loadDaily(roomId: string, uid: string): Promise<DailyView> {
  const day = challengeDay();
  const [attempt, today, yesterday, { data: mine }] = await Promise.all([
    loadAttempt(roomId, uid, day),
    ranking(roomId, day),
    ranking(roomId, yesterdayOf(day)),
    adminDb().from("daily_challenges").select("reward").eq("room_id", roomId).eq("user_id", uid).eq("day", day).eq("kind", "orapa").maybeSingle(),
  ]);
  return {
    day,
    attempt: { ...attempt, score: scoreOf(attempt), reward: mine?.reward ?? null },
    solution: attempt.solved ? gridOf(roomId, day) : null,
    today,
    yesterday: yesterday.filter((r) => r.solved),
  };
}

