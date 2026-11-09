// Boosters du jour côté serveur (pas une server action).
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminDb } from "@/src/lib/db/server";
import { challengeDay, kindFor, ranking, yesterdayOf } from "@/src/modules/challenges/data";
import { offersOf, winners } from "./cards";

/** A-t-il répondu à la question du jour ? (`sb` : client de l'utilisateur, comme la page Question) */
export async function answeredToday(sb: SupabaseClient, roomId: string, uid: string) {
  const { data: main } = await sb.rpc("today_activity", { r: roomId }).single<{ id: string }>();
  if (!main) return false;
  const { data } = await sb.from("answers").select("user_id").eq("activity_id", main.id).eq("user_id", uid).maybeSingle();
  return !!data;
}

/** A-t-il gagné (ou fini ex aequo) le défi d'hier ? (le défi change chaque jour : on prend celui d'hier) */
export async function wonYesterday(roomId: string, uid: string) {
  const day = yesterdayOf(challengeDay());
  return winners(await ranking(roomId, day, (await kindFor(roomId, day)).kind)).includes(uid);
}

export async function loadOffers(sb: SupabaseClient, roomId: string, uid: string) {
  const day = challengeDay(), yesterday = yesterdayOf(day);
  const [answered, won, { data: rows }] = await Promise.all([
    answeredToday(sb, roomId, uid),
    wonYesterday(roomId, uid),
    adminDb().from("farm_stats").select("key").eq("room_id", roomId).eq("user_id", uid).like("key", "tcg:%"),
  ]);
  return offersOf({ answered, wonYesterday: won, taken: new Set((rows ?? []).map((r) => r.key as string)), day, yesterday });
}
