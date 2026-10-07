// Appelée toutes les 5 minutes par Supabase (pg_cron, voir supabase/setup/notifications_cron.sql) :
// envoie les notifications programmées.
import { adminDb } from "@/src/lib/db/server";
import { ITEMS, isItem } from "@/src/modules/farm/catalog";
import { recipeOf } from "@/src/modules/farm/rules";
import { notify, throttle } from "@/src/modules/notifications/push";

const QUESTION_HOUR = 9; // heure de Paris

export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("Non autorisé", { status: 401 });
  const [farm, question] = await Promise.all([harvests(), dailyQuestion()]);
  return Response.json({ farm, question });
}

/** Récoltes et productions devenues prêtes depuis le dernier passage (une notification par serre). */
async function harvests() {
  const { data } = await adminDb()
    .from("farm_tiles").update({ notified: true })
    .eq("notified", false).not("item", "is", null).lte("ready_at", new Date().toISOString())
    .select("room_id, user_id, kind, item");
  const byFarm = new Map<string, { room: string; user: string; items: string[] }>();
  for (const t of data ?? []) {
    const k = `${t.room_id}:${t.user_id}`;
    const out = recipeOf(t.kind, t.item)?.out;
    if (!byFarm.has(k)) byFarm.set(k, { room: t.room_id, user: t.user_id, items: [] });
    if (out && isItem(out)) byFarm.get(k)!.items.push(ITEMS[out].name);
  }
  await Promise.all(
    [...byFarm.values()].map((f) =>
      notify([f.user], "farm", {
        title: "Ta serre",
        body: f.items.length > 1 ? `${f.items.length} productions sont prêtes.` : `${f.items[0] ?? "Une production"} : c'est prêt !`,
        url: `/r/${f.room}/farm`,
        tag: `farm-${f.room}`,
      }),
    ),
  );
  return byFarm.size;
}

/** Une fois par jour à 9 h (heure de Paris) : « la question du jour est là », pour chaque salle. */
async function dailyQuestion() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  if (Number(get("hour")) !== QUESTION_HOUR) return 0;
  const day = `${get("year")}-${get("month")}-${get("day")}`;

  const admin = adminDb();
  const { data: rooms } = await admin.from("rooms").select("id, name");
  let sent = 0;
  for (const r of rooms ?? []) {
    const { data: members } = await admin.from("room_members").select("user_id").eq("room_id", r.id);
    const to = await throttle((members ?? []).map((m) => m.user_id), `question:${day}:${r.id}`); // une seule fois par jour
    await notify(to, "question", { title: r.name, body: "La question du jour vous attend.", url: `/r/${r.id}/question`, tag: `question-${r.id}` });
    sent += to.length;
  }
  return sent;
}
