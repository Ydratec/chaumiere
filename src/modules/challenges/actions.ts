"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/src/lib/db/server";
import { loadUnlocks } from "@/src/modules/farm/data";
import { GAME_LOCKS } from "@/src/modules/farm/projects";
import { getRoomContext } from "@/src/modules/rooms/context";
import { challengeDay, gridOf, loadAttempt } from "./data";
import { rewardOf, scoreOf, sendWave, tryGuess, type DailyAttempt } from "./orapa-daily";

/** Membre de la salle, et Orapa débloqué (le défi en est une variante). */
async function member(roomId: string) {
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  if (!(await loadUnlocks(roomId)).includes(GAME_LOCKS.orapa)) throw new Error("Orapa n'est pas débloqué");
  return c.user.id;
}

const save = (roomId: string, uid: string, day: string, a: DailyAttempt) =>
  adminDb().from("daily_challenges").upsert({ room_id: roomId, user_id: uid, day, kind: "orapa", log: a.log, misses: a.misses, updated_at: new Date().toISOString() });

/** Envoyer une onde dans la grille du jour. */
export async function dailyWave(roomId: string, from: string): Promise<{ error?: string }> {
  const uid = await member(roomId);
  const day = challengeDay();
  const next = sendWave(gridOf(roomId, day), await loadAttempt(roomId, uid, day), String(from));
  if (!next) return { error: "Onde impossible (déjà envoyée, ou défi terminé)." };
  await save(roomId, uid, day, next);
  revalidatePath(`/r/${roomId}/games/defi`);
  return {};
}

/** Tenter une grille : juste = défi réussi et pièces gagnées ; faux = +3 au score. */
export async function dailyGuess(roomId: string, grid: unknown): Promise<{ right?: boolean; reward?: number; error?: string }> {
  const uid = await member(roomId);
  const day = challengeDay();
  const res = tryGuess(gridOf(roomId, day), await loadAttempt(roomId, uid, day), grid);
  if (!res) return { error: "Défi déjà terminé." };
  const admin = adminDb();
  if (!res.right) {
    await save(roomId, uid, day, res.attempt);
    revalidatePath(`/r/${roomId}/games/defi`);
    return { right: false };
  }
  const score = scoreOf(res.attempt), reward = rewardOf(score);
  // Une seule fois : la ligne n'est marquée trouvée que si elle ne l'était pas encore ; on ne paie que dans ce cas.
  await save(roomId, uid, day, res.attempt);
  const { data } = await admin.from("daily_challenges")
    .update({ solved_at: new Date().toISOString(), score, reward })
    .eq("room_id", roomId).eq("user_id", uid).eq("day", day).eq("kind", "orapa").is("solved_at", null)
    .select("reward");
  if (data?.length) await admin.rpc("farm_add_items", { r: roomId, u: uid, delta: { coins: reward } });
  revalidatePath(`/r/${roomId}`, "layout");
  return { right: true, reward };
}
