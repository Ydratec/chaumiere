// Chargement de la montgolfière (serveur) : réponses aux questions du jour de la salle depuis son décollage.
import type { SupabaseClient } from "@supabase/supabase-js";
import { flight, type DayAnswers } from "./balloon";

/** Jour du décollage : les jours d'avant ne comptent pas (la montgolfière part du sol à sa sortie). */
export const FLIGHT_START = "2026-10-26";
const back = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

export async function loadFlight(sb: SupabaseClient, roomId: string, members: string[], today: string) {
  // On lit aussi les 6 jours d'avant le décollage : ils disent qui est actif au début.
  const { data: acts } = await sb.from("daily_activities").select("id, day").eq("room_id", roomId).eq("type", "question").eq("slot", 0)
    .gte("day", back(FLIGHT_START, 6)).lte("day", today);
  const ids = (acts ?? []).map((a) => a.id as string);
  const { data: answers } = ids.length ? await sb.from("answers").select("activity_id, user_id").in("activity_id", ids) : { data: [] };
  const days: DayAnswers[] = (acts ?? []).map((a) => ({ day: a.day as string, users: (answers ?? []).filter((x) => x.activity_id === a.id).map((x) => x.user_id as string) }));
  return flight(days, members, today, FLIGHT_START);
}
