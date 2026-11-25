// Flamme de la salle : nombre de jours d'affilée où tous les membres ont répondu à la question du jour.
import type { SupabaseClient } from "@supabase/supabase-js";

const back = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
const LOOKBACK = 120; // au-delà, la flamme affiche au moins ce nombre (elle ne remonte pas plus loin)

/**
 * `days` : jours d'affilée où tout le monde a répondu. Aujourd'hui compte dès que tout le monde a répondu ;
 * sinon la série court jusqu'à hier (elle n'est pas encore perdue). `answered` : réponses du jour.
 */
export async function loadStreak(sb: SupabaseClient, roomId: string, members: string[], today: string) {
  const { data: acts } = await sb.from("daily_activities").select("id, day").eq("room_id", roomId).eq("type", "question").eq("slot", 0)
    .gte("day", back(today, LOOKBACK)).lte("day", today);
  const ids = (acts ?? []).map((a) => a.id as string);
  const { data: answers } = ids.length ? await sb.from("answers").select("activity_id, user_id").in("activity_id", ids) : { data: [] };
  const who = new Map<string, Set<string>>();
  for (const a of acts ?? []) who.set(a.day as string, new Set());
  const dayOf = new Map((acts ?? []).map((a) => [a.id as string, a.day as string]));
  for (const x of answers ?? []) who.get(dayOf.get(x.activity_id as string)!)?.add(x.user_id as string);
  const all = (day: string) => !!who.get(day) && members.every((m) => who.get(day)!.has(m));

  const answered = members.filter((m) => who.get(today)?.has(m)).length;
  let days = 0;
  for (let i = all(today) ? 0 : 1; i <= LOOKBACK && all(back(today, i)); i++) days++;
  return { days, answered, total: members.length, today: all(today) };
}
