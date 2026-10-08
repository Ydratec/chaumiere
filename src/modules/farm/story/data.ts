// Chargement de l'onglet « Histoire » (serveur uniquement, pas une server action).
import { adminDb } from "@/src/lib/db/server";
import { paris } from "@/src/modules/questions/day";
import type { Inventory } from "../catalog";
import type { Farm } from "../data";
import { activeEvents } from "./events";
import { chapterOf } from "./index";
import { dailyOrders, producible } from "./orders";
import { SECRETS } from "./secrets";
import { DAILY } from "./ch1";
import { currentQuest, goalProgress, nextAct, openAct, questsDone, type GoalProgress } from "./state";
import type { Line, Quest, Who } from "./types";

export type StoryOrder = { id: number; npc: Who; wants: Inventory; reward: number; done: boolean };
export type StoryData = {
  chapter: { n: number; title: string; actTitle: string; day: number; total: number; done: number };
  quest: (Quest & { progress: GoalProgress }) | null; // quête en cours
  next: { title: string; inDays: number; teaser: string } | null; // prochain acte pas encore sorti
  finished: boolean; // toutes les quêtes écrites sont faites
  orders: StoryOrder[];
  events: { id: string; title: string; text: string; scene: Line[] | null }[]; // scène : seulement si pas encore vue
  journal: { id: string; title: string; text: string }[];
  secrets: number;
  daily: Line;
};

export async function loadStory(roomId: string, uid: string, farm: Farm): Promise<StoryData | null> {
  const ch = chapterOf(farm.story.chapter);
  if (!ch) return null;
  const admin = adminDb();
  const today = paris(new Date()).date;
  const [{ data: stats }, { data: journal }, { data: secrets }, { data: existing }] = await Promise.all([
    admin.from("farm_stats").select("key, count").eq("room_id", roomId).eq("user_id", uid),
    admin.from("farm_journal").select("page").eq("room_id", roomId).eq("user_id", uid),
    admin.from("farm_secrets").select("secret").eq("room_id", roomId).eq("user_id", uid),
    admin.from("farm_orders").select("id, npc, wants, reward, done, slot").eq("room_id", roomId).eq("user_id", uid).eq("day", today).order("slot"),
  ]);
  let orders = existing ?? [];
  if (!orders.length) {
    const rows = dailyOrders(uid, today, producible(farm.unlocks)).map((o) => ({ room_id: roomId, user_id: uid, day: today, ...o }));
    await admin.from("farm_orders").upsert(rows, { onConflict: "room_id,user_id,day,slot", ignoreDuplicates: true });
    orders = (await admin.from("farm_orders").select("id, npc, wants, reward, done, slot").eq("room_id", roomId).eq("user_id", uid).eq("day", today).order("slot")).data ?? [];
  }

  const { day, done, catch: cu } = farm.story;
  const counters = Object.fromEntries((stats ?? []).map((s) => [s.key, s.count as number]));
  const q = currentQuest(ch, done, day);
  const seen = new Set((journal ?? []).map((j) => j.page as string));
  const nx = nextAct(ch, day);
  const act = ch.acts.find((a) => a.n === openAct(ch, day));

  return {
    chapter: { n: ch.n, title: ch.title, actTitle: act?.title ?? "", day, total: ch.quests.length, done: questsDone(done).length },
    quest: q ? { ...q, progress: goalProgress(q.goal, farm.items, farm.tiles, counters, cu.cost) } : null,
    next: nx ? { title: nx.title, inDays: nx.day - day, teaser: ch.acts.find((a) => a.n === nx.n - 1)?.teaser ?? "" } : null,
    finished: ch.quests.every((x) => done.includes(x.id)),
    orders: orders.map((o) => ({ id: o.id as number, npc: o.npc as Who, wants: o.wants as Inventory, reward: o.reward as number, done: o.done as boolean })),
    events: activeEvents(day).map((e) => ({ id: e.id, title: e.title, text: e.text, scene: e.scene && !seen.has(`event:${e.id}`) ? e.scene.lines : null })),
    journal: ch.quests.filter((x) => seen.has(`${ch.n}:${x.id}`)).map((x) => ({ id: x.id, ...x.page })),
    secrets: SECRETS.filter((s) => (secrets ?? []).some((f) => f.secret === s.id)).length,
    daily: DAILY[(day + uid.charCodeAt(0)) % DAILY.length],
  };
}
