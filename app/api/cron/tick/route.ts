// Appelée toutes les 5 minutes par Supabase (pg_cron, voir supabase/setup/notifications_cron.sql) :
// envoie les notifications programmées (question du jour à l'heure de chaque salle, récoltes prêtes).
import { adminDb } from "@/src/lib/db/server";
import { ITEMS, isItem } from "@/src/modules/farm/catalog";
import { recipeOf } from "@/src/modules/farm/rules";
import { chapterOf } from "@/src/modules/farm/story";
import { activeEvents } from "@/src/modules/farm/story/events";
import { chapterDay } from "@/src/modules/farm/story/state";
import { notify, throttle } from "@/src/modules/notifications/push";
import { notifyHour, paris, questionDay } from "@/src/modules/questions/day";


export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("Non autorisé", { status: 401 });
  const [farm, question, story] = await Promise.all([harvests(), dailyQuestion(), storyNews()]);
  return Response.json({ farm, question, story });
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

/** Une fois par « jour de question » et par salle, à l'heure où la question change (9 h si c'est la nuit). */
async function dailyQuestion() {
  const now = new Date();
  const hour = paris(now).hour;
  const admin = adminDb();
  const { data: rooms } = await admin.from("rooms").select("id, name, question_hour");
  let sent = 0;
  for (const r of rooms ?? []) {
    if (notifyHour(r.question_hour) !== hour) continue;
    const { data: members } = await admin.from("room_members").select("user_id").eq("room_id", r.id);
    const day = questionDay(r.question_hour, now);
    const to = await throttle((members ?? []).map((m) => m.user_id), `question:${day}:${r.id}`); // une seule fois par jour
    await notify(to, "question", { title: r.name, body: "La question du jour vous attend.", url: `/r/${r.id}/question`, tag: `question-${r.id}` });
    sent += to.length;
  }
  return sent;
}

/** Nouvel acte de l'histoire ou début d'un événement : une seule notification par salle, en journée (dès 10 h). */
async function storyNews() {
  const now = new Date();
  const hour = paris(now).hour;
  if (hour < 10 || hour >= 22) return 0;
  const admin = adminDb();
  const { data: rooms } = await admin.from("rooms").select("id, chapter, chapter_started_at");
  let sent = 0;
  for (const r of rooms ?? []) {
    const ch = chapterOf(r.chapter);
    if (!ch) continue;
    const day = chapterDay(r.chapter_started_at, now.getTime());
    const act = ch.acts.filter((a) => a.day === day && ch.quests.some((q) => q.act === a.n)).at(0);
    const events = activeEvents(day).filter((e) => e.day === day);
    if (!act && !events.length) continue;
    const { data: members } = await admin.from("room_members").select("user_id").eq("room_id", r.id);
    const everyone = (members ?? []).map((m) => m.user_id as string);
    if (act) {
      const to = await throttle(everyone, `act:${r.chapter}:${act.n}:${r.id}`);
      await notify(to, "farm", act.n === 1
        ? { title: ch.title, body: "L'histoire commence : un courrier de Mirabelle vous attend à la serre…", url: `/r/${r.id}/farm`, tag: `act-${r.id}` }
        : { title: `Épisode ${act.n} · ${act.title}`, body: "Un courrier de Mirabelle est arrivé à la serre…", url: `/r/${r.id}/farm`, tag: `act-${r.id}` });
      sent += to.length;
    }
    for (const e of events) {
      const to = await throttle(everyone, `event:${r.chapter}:${e.id}:${r.id}`);
      await notify(to, "farm", { title: e.title, body: e.text, url: `/r/${r.id}/farm`, tag: `event-${e.id}` });
      sent += to.length;
    }
  }
  return sent;
}
