// Lecture/initialisation de la ferme côté serveur (pas une server action : jamais appelable du client).
import { adminDb } from "@/src/lib/db/server";
import { START_CAT, START_COINS, START_OBJECTS, isItem, type Inventory } from "./catalog";
import { activeProjects, type Project } from "./projects";
import type { Cell, Tile } from "./rules";
import { ACTIVE_DAYS, catchUp, type CatchUp } from "./story/catchup";
import { eventKeys } from "./story/events";
import { chapterOf } from "./story";
import { chapterDay, personalUnlocks, questsDone } from "./story/state";

export type Gift = { id: number; giver: string; item: string; contents: Inventory | null; message: string | null; day: string }; // contents : le bouquet, ou null (une fleur : item)
/** gifts : cadeaux à ouvrir ; collection : fleurs reçues (cadeaux ouverts), gardées. */
export type Farm = { tiles: Tile[]; items: Inventory; unlocks: string[]; cat: Cell; gifts: Gift[]; collection: Gift[]; album: Record<string, number>; now: number; story: StoryCore }; // now : heure du serveur
/** Ce qu'il faut savoir de l'histoire pour jouer : chapitre, quêtes finies, rattrapage. */
export type StoryCore = { chapter: number; day: number; done: string[]; catch: CatchUp; activeAt: string | null };
export type ProjectState = Project & { progress: Inventory; givers: Record<string, number> };
export type Offer = { id: number; seller: string; give: Inventory; want: Inventory };

const toInventory = (rows: { item: string; qty: number }[]) =>
  Object.fromEntries(rows.filter((i) => isItem(i.item)).map((i) => [i.item, i.qty])) as Inventory;

/** Première visite : 3 bacs potagers et quelques pièces. Idempotent (ne refait rien si la ferme existe). */
export async function ensureFarm(roomId: string, uid: string) {
  const admin = adminDb();
  const { data } = await admin.from("farm_items").select("item").eq("room_id", roomId).eq("user_id", uid).eq("item", "coins").maybeSingle();
  if (data) return;
  await admin.from("farm_tiles").upsert(
    START_OBJECTS.map((o) => ({ room_id: roomId, user_id: uid, ...o })),
    { ignoreDuplicates: true },
  );
  await admin.from("farm_items").upsert({ room_id: roomId, user_id: uid, item: "coins", qty: START_COINS }, { ignoreDuplicates: true });
}

export async function loadUnlocks(roomId: string) {
  const { data } = await adminDb().from("room_unlocks").select("key").eq("room_id", roomId);
  return (data ?? []).map((u) => u.key as string);
}

/** Chapitre de la salle, quêtes finies (les miennes et celles des autres joueurs actifs) et rattrapage qui en découle. */
async function loadStoryCore(roomId: string, uid: string, now: number): Promise<StoryCore> {
  const admin = adminDb();
  const [{ data: room }, { data: activity }] = await Promise.all([
    admin.from("rooms").select("chapter, chapter_started_at").eq("id", roomId).single(),
    admin.from("farm_activity").select("user_id, at").eq("room_id", roomId),
  ]);
  const chapter = room?.chapter ?? 1;
  const { data: rows } = await admin.from("farm_quest_done").select("user_id, quest").eq("room_id", roomId).eq("chapter", chapter);
  const done = (rows ?? []).filter((r) => r.user_id === uid).map((r) => r.quest as string);
  const since = now - ACTIVE_DAYS * 86_400_000;
  const peers = (activity ?? [])
    .filter((a) => a.user_id !== uid && Date.parse(a.at) > since)
    .map((a) => questsDone((rows ?? []).filter((r) => r.user_id === a.user_id).map((r) => r.quest as string)).length);
  return {
    chapter,
    day: chapterDay(room?.chapter_started_at ?? now, now),
    done,
    catch: catchUp(questsDone(done).length, peers),
    activeAt: (activity ?? []).find((a) => a.user_id === uid)?.at ?? null,
  };
}

/** Note le passage du joueur (au plus une fois par heure) : sert à savoir qui est actif. */
export async function touchActivity(roomId: string, uid: string, story: StoryCore) {
  if (story.activeAt && Date.now() - Date.parse(story.activeAt) < 3_600_000) return;
  await adminDb().from("farm_activity").upsert({ room_id: roomId, user_id: uid, at: new Date().toISOString() });
}

export async function loadFarm(roomId: string, uid: string): Promise<Farm> {
  const admin = adminDb();
  const now = Date.now();
  const [{ data: tiles }, { data: items }, { data: cat }, { data: gifts }, { data: bloom }, roomUnlocks, story] = await Promise.all([
    admin.from("farm_tiles").select("x, y, kind, item, started_at, ready_at").eq("room_id", roomId).eq("user_id", uid),
    admin.from("farm_items").select("item, qty").eq("room_id", roomId).eq("user_id", uid),
    admin.from("farm_cats").select("x, y").eq("room_id", roomId).eq("user_id", uid).maybeSingle(),
    admin.from("farm_gifts").select("id, giver, item, contents, message, day, opened").eq("room_id", roomId).eq("receiver", uid).order("id", { ascending: false }),
    admin.from("farm_stats").select("key, count").eq("room_id", roomId).eq("user_id", uid).like("key", "bloom:%"),
    loadUnlocks(roomId),
    loadStoryCore(roomId, uid, now),
  ]);
  const ch = chapterOf(story.chapter);
  // Déblocages de la salle + ceux de l'histoire (bâtiments, plafonds) + coefficients des événements et du rattrapage.
  const unlocks = [
    ...roomUnlocks,
    ...(ch ? personalUnlocks(ch, story.done) : []),
    ...(story.day < 1 ? ["b:coop", "b:oven", "cap:planter:99", "cap:pot:99"] : []), // l'histoire n'a pas commencé : règles d'avant
    ...eventKeys(story.day),
    ...(story.catch.speed < 1 ? [`speed:${story.catch.speed.toFixed(3)}`] : []),
  ];
  return { tiles: (tiles ?? []) as Tile[], items: toInventory(items ?? []), unlocks, cat: cat ?? START_CAT, gifts: ((gifts ?? []) as (Gift & { opened: boolean })[]).filter((g) => !g.opened).reverse(),
    collection: ((gifts ?? []) as (Gift & { opened: boolean })[]).filter((g) => g.opened),
    album: Object.fromEntries((bloom ?? []).map((b) => [b.key.slice(6), b.count as number])),
    now,
    story,
  };
}

/** Projets en cours de la salle, avec ce qui a déjà été donné et par qui. */
export async function loadProjects(roomId: string, unlocks: string[]): Promise<ProjectState[]> {
  const active = activeProjects(unlocks);
  if (!active.length) return [];
  const { data } = await adminDb()
    .from("farm_contributions").select("project, user_id, item, qty")
    .eq("room_id", roomId).in("project", active.map((p) => p.key));
  return active.map((p) => {
    const rows = (data ?? []).filter((c) => c.project === p.key);
    const progress: Inventory = {};
    const givers: Record<string, number> = {};
    for (const c of rows) {
      if (isItem(c.item)) progress[c.item] = (progress[c.item] ?? 0) + c.qty;
      givers[c.user_id] = (givers[c.user_id] ?? 0) + c.qty;
    }
    return { ...p, progress, givers };
  });
}

export async function loadOffers(roomId: string): Promise<Offer[]> {
  const { data } = await adminDb()
    .from("farm_offers").select("id, seller, give, want")
    .eq("room_id", roomId).eq("status", "open").order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as Offer[];
}

/** Nombre de récoltes/productions prêtes (pour l'accueil de la salle). */
export async function readyCount(roomId: string, uid: string) {
  const { count } = await adminDb()
    .from("farm_tiles").select("x", { count: "exact", head: true })
    .eq("room_id", roomId).eq("user_id", uid).not("item", "is", null).lte("ready_at", new Date().toISOString());
  return count ?? 0;
}

/** A-t-on déjà offert un cadeau à cette personne aujourd'hui (heure de Paris) ? */
export async function giftedToday(roomId: string, giver: string, receiver: string) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const { data } = await adminDb().from("farm_gifts").select("id").eq("room_id", roomId).eq("giver", giver).eq("receiver", receiver).eq("day", day).maybeSingle();
  return !!data;
}
