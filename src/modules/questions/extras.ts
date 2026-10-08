// Questions achetées du jour (côté serveur uniquement).
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminDb } from "@/src/lib/db/server";
import type { Activity } from "../activities/registry";

/** Questions achetées pour la même journée que la question du jour, dans l'ordre d'achat. */
export async function todayExtras(sb: SupabaseClient, main: Activity | null) {
  if (!main?.day) return [];
  const { data } = await sb.from("daily_activities").select("*")
    .eq("room_id", main.room_id).eq("day", main.day).eq("type", "question").gt("slot", 0).order("slot");
  return (data ?? []) as Activity[];
}

/** Prix actuel d'une question en plus dans la salle. */
export async function questionPrice(roomId: string) {
  const { data } = await adminDb().rpc("question_price", { r: roomId });
  return Number(data ?? 0);
}
