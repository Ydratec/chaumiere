// Lecture/initialisation de la ferme côté serveur (pas une server action : jamais appelable du client).
import { adminDb } from "@/src/lib/db/server";
import { START_CAT, START_COINS, START_OBJECTS, isItem, type Inventory } from "./catalog";
import { activeProjects, type Project } from "./projects";
import type { Cell, Tile } from "./rules";

export type Farm = { tiles: Tile[]; items: Inventory; unlocks: string[]; cat: Cell; now: number }; // now : heure du serveur
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

export async function loadFarm(roomId: string, uid: string): Promise<Farm> {
  const admin = adminDb();
  const [{ data: tiles }, { data: items }, { data: cat }, unlocks] = await Promise.all([
    admin.from("farm_tiles").select("x, y, kind, item, started_at, ready_at").eq("room_id", roomId).eq("user_id", uid),
    admin.from("farm_items").select("item, qty").eq("room_id", roomId).eq("user_id", uid),
    admin.from("farm_cats").select("x, y").eq("room_id", roomId).eq("user_id", uid).maybeSingle(),
    loadUnlocks(roomId),
  ]);
  return { tiles: (tiles ?? []) as Tile[], items: toInventory(items ?? []), unlocks, cat: cat ?? START_CAT, now: Date.now() };
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
