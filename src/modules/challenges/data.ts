// Défi du jour côté serveur (pas une server action) : graine secrète, chargement des essais et du classement.
import { createHash } from "node:crypto";
import { adminDb } from "@/src/lib/db/server";
import { paris } from "@/src/modules/questions/day";
import type { Grid } from "../games/orapa";
import { loadUnlocks } from "@/src/modules/farm/data";
import { GAME_LOCKS } from "@/src/modules/farm/projects";
import { CODE_MAX, codeDone, secretCode, type CodeAttempt, type CodeEntry, type Peg } from "./code-daily";
import { MOT_MAX, answerAt, motDone, type MotAttempt, type MotEntry } from "./mot-daily";
import { SOLUTIONS } from "./mots";
import { dailyGrid, scoreOf, seeded, type DailyAttempt, type DailyEntry } from "./orapa-daily";
import { kindOf, occurrence, type ChallengeKind } from "./rotation";

/** Jour du défi (Paris) : il change à minuit. */
export const challengeDay = (at = new Date()) => paris(at).date;
const yesterdayOf = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Graine de la grille : secrète (le poivre du serveur), propre à la salle et au jour. */
function seedOf(roomId: string, day: string, kind = "orapa") {
  const h = createHash("sha256").update(`${process.env.AUTH_PEPPER ?? ""}:${kind}:${roomId}:${day}`).digest();
  return h.readInt32LE(0);
}
export const gridOf = (roomId: string, day: string): Grid => dailyGrid(seedOf(roomId, day));
/** Code secret du jour (jamais envoyé au navigateur avant la fin). */
export const codeOf = (roomId: string, day: string): Peg[] => secretCode(seeded(seedOf(roomId, day, "code")));
/** Mot du jour : la liste est mélangée une fois pour la salle, puis parcourue (pas de mot répété avant la fin de la liste). */
export const motOf = (roomId: string, day: string, orapa: boolean) => answerAt(SOLUTIONS, seeded(seedOf(roomId, "liste", "mot")), occurrence(day, orapa));

/** Le défi de ce jour pour la salle (Orapa n'entre dans la rotation que s'il est débloqué). */
export async function kindFor(roomId: string, day = challengeDay()) {
  const orapa = (await loadUnlocks(roomId)).includes(GAME_LOCKS.orapa);
  return { kind: kindOf(day, orapa), orapa };
}

type Row = { user_id: string; log: DailyEntry[]; misses: number; solved_at: string | null; score: number | null; reward: number | null };

export async function loadAttempt(roomId: string, uid: string, day = challengeDay()): Promise<DailyAttempt> {
  const { data } = await adminDb().from("daily_challenges").select("log, misses, solved_at")
    .eq("room_id", roomId).eq("user_id", uid).eq("day", day).eq("kind", "orapa").maybeSingle();
  return { log: (data?.log as DailyEntry[]) ?? [], misses: data?.misses ?? 0, solved: !!data?.solved_at };
}

export type Ranking = { user: string; solved: boolean; failed: boolean; score: number; waves: number; misses: number; at: string | null }[];

/** Classement d'un jour : ceux qui ont trouvé (meilleur score, puis le plus tôt), puis ceux qui cherchent encore, puis les ratés. */
export async function ranking(roomId: string, day: string, kind: ChallengeKind = "orapa"): Promise<Ranking> {
  const { data } = await adminDb().from("daily_challenges").select("user_id, log, misses, solved_at, score, reward")
    .eq("room_id", roomId).eq("day", day).eq("kind", kind);
  const max = kind === "code" ? CODE_MAX : kind === "mot" ? MOT_MAX : Infinity;
  const rank = (r: { solved: boolean; failed: boolean }) => (r.solved ? 0 : r.failed ? 2 : 1);
  return ((data ?? []) as Row[])
    .map((r) => ({
      user: r.user_id, solved: !!r.solved_at, failed: !r.solved_at && r.log.length >= max,
      score: r.score ?? (kind === "orapa" ? scoreOf(r) : r.log.length), waves: r.log.length, misses: r.misses, at: r.solved_at,
    }))
    .sort((a, b) => rank(a) - rank(b) || (a.solved ? a.score - b.score || Date.parse(a.at!) - Date.parse(b.at!) : 0));
}

export type DailyView = {
  day: string;
  attempt: DailyAttempt & { score: number; reward: number | null };
  solution: Grid | null; // seulement une fois trouvée
  today: Ranking;
  yesterday: Ranking;
  yesterdayKind: ChallengeKind;
};

export async function loadDaily(roomId: string, uid: string): Promise<DailyView> {
  const day = challengeDay();
  const yesterdayKind = (await kindFor(roomId, yesterdayOf(day))).kind;
  const [attempt, today, yesterday, { data: mine }] = await Promise.all([
    loadAttempt(roomId, uid, day),
    ranking(roomId, day, "orapa"),
    ranking(roomId, yesterdayOf(day), yesterdayKind),
    adminDb().from("daily_challenges").select("reward").eq("room_id", roomId).eq("user_id", uid).eq("day", day).eq("kind", "orapa").maybeSingle(),
  ]);
  return {
    day,
    attempt: { ...attempt, score: scoreOf(attempt), reward: mine?.reward ?? null },
    solution: attempt.solved ? gridOf(roomId, day) : null,
    today,
    yesterday: yesterday.filter((r) => r.solved),
    yesterdayKind,
  };
}


/** Code secret et Mot du jour : un essai par ligne du journal. */
export type SimpleAttempt<E> = { log: E[]; solved: boolean };
export type SimpleView<E> = {
  day: string;
  attempt: SimpleAttempt<E> & { done: boolean; reward: number | null };
  solution: string[] | string | null; // seulement une fois le défi fini
  today: Ranking;
  yesterday: Ranking;
  yesterdayKind: ChallengeKind;
};

export async function loadSimple<E>(roomId: string, uid: string, kind: "code" | "mot", day = challengeDay()): Promise<SimpleAttempt<E>> {
  const { data } = await adminDb().from("daily_challenges").select("log, solved_at")
    .eq("room_id", roomId).eq("user_id", uid).eq("day", day).eq("kind", kind).maybeSingle();
  return { log: (data?.log as E[]) ?? [], solved: !!data?.solved_at };
}

export async function loadSimpleView(roomId: string, uid: string, kind: "code" | "mot", orapa: boolean): Promise<SimpleView<CodeEntry | MotEntry>> {
  const day = challengeDay(), yday = yesterdayOf(day), yesterdayKind = kindOf(yday, orapa);
  const [attempt, today, yesterday, { data: mine }] = await Promise.all([
    loadSimple<CodeEntry | MotEntry>(roomId, uid, kind, day),
    ranking(roomId, day, kind),
    ranking(roomId, yday, yesterdayKind),
    adminDb().from("daily_challenges").select("reward").eq("room_id", roomId).eq("user_id", uid).eq("day", day).eq("kind", kind).maybeSingle(),
  ]);
  const done = kind === "code" ? codeDone(attempt as CodeAttempt) : motDone(attempt as MotAttempt);
  return {
    day,
    attempt: { ...attempt, done, reward: mine?.reward ?? null },
    solution: done ? (kind === "code" ? codeOf(roomId, day) : motOf(roomId, day, orapa)) : null,
    today,
    yesterday: yesterday.filter((r) => r.solved),
    yesterdayKind,
  };
}
