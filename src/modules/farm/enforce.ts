// Remet les serres aux règles (plafonds d'objets) : retire les objets en trop et rembourse leur prix (serveur uniquement).
import { adminDb } from "@/src/lib/db/server";
import { BUILDINGS, isBuilding } from "./catalog";
import type { Inventory } from "./catalog";
import { isFlower, pickFlower } from "./flowers";
import { excessTiles, producedOf, recipeOf, isReady, type Tile } from "./rules";
import { chapterOf } from "./story";
import { chapterDay, personalUnlocks } from "./story/state";

export type Trimmed = { room: string; user: string; removed: Record<string, number>; refund: number; given: Inventory }; // given : récoltes prêtes et ingrédients rendus

/**
 * Applique les plafonds à toutes les serres (ou les compte seulement, avec `apply` à faux) : les objets en trop sont retirés
 * et remboursés (prix de construction ; récolte prête donnée ; ingrédients rendus si ça poussait encore).
 * Les salles où l'histoire n'a pas commencé sont ignorées.
 */
export async function enforceRules(apply: boolean): Promise<Trimmed[]> {
  const admin = adminDb();
  const [{ data: rooms }, { data: tiles }, { data: done }, { data: unlocks }] = await Promise.all([
    admin.from("rooms").select("id, chapter, chapter_started_at"),
    admin.from("farm_tiles").select("room_id, user_id, x, y, kind, item, started_at, ready_at"),
    admin.from("farm_quest_done").select("room_id, user_id, chapter, quest"),
    admin.from("room_unlocks").select("room_id, key"),
  ]);
  const report: Trimmed[] = [];
  for (const room of rooms ?? []) {
    const ch = chapterOf(room.chapter);
    if (!ch || chapterDay(room.chapter_started_at, Date.now()) < 1) continue; // règles pas encore en vigueur
    const roomKeys = (unlocks ?? []).filter((u) => u.room_id === room.id).map((u) => u.key as string);
    const owners = new Set((tiles ?? []).filter((t) => t.room_id === room.id).map((t) => t.user_id as string));
    for (const user of owners) {
      const mine = (tiles ?? []).filter((t) => t.room_id === room.id && t.user_id === user) as (Tile & { room_id: string; user_id: string })[];
      const quests = (done ?? []).filter((d) => d.room_id === room.id && d.user_id === user && d.chapter === room.chapter).map((d) => d.quest as string);
      const extra = excessTiles(mine, [...roomKeys, ...personalUnlocks(ch, quests)], Date.now());
      if (!extra.length) continue;
      const removed: Record<string, number> = {};
      const given: Inventory = {};
      let refund = 0;
      const give = (k: string, n: number) => { given[k as keyof Inventory] = (given[k as keyof Inventory] ?? 0) + n; };
      for (const t of extra) {
        removed[t.kind] = (removed[t.kind] ?? 0) + 1;
        refund += isBuilding(t.kind) ? BUILDINGS[t.kind].cost : 0;
        const r = recipeOf(t.kind, t.item);
        if (r) {
          if (isReady(t, Date.now())) give(producedOf(t) === "flower" && !t.item?.includes(":") ? pickFlower() : producedOf(t)!, r.qty);
          else for (const [k, v] of Object.entries(r.inputs)) give(k, v ?? 0);
        }
        if (apply) await admin.from("farm_tiles").delete().eq("room_id", room.id).eq("user_id", user).eq("x", t.x).eq("y", t.y);
      }
      if (apply) {
        const delta: Inventory = { ...given, coins: (given.coins ?? 0) + refund };
        await admin.rpc("farm_add_items", { r: room.id, u: user, delta });
        for (const [k, v] of Object.entries(given)) if (isFlower(k)) await admin.rpc("farm_stat_add", { r: room.id, u: user, k: `bloom:${k}`, n: v ?? 0 });
        // Mot laissé au joueur : la fenêtre « serres remises aux règles » lit cette ligne (format : trim:<date>|bac=27;pot=13|<pièces>).
        const what = Object.entries(removed).map(([k, v]) => `${k}=${v}`).join(";");
        await admin.from("farm_journal").insert({ room_id: room.id, user_id: user, page: `trim:${Date.now()}|${what}|${refund}` });
      }
      report.push({ room: room.id, user, removed, refund, given });
    }
  }
  return report;
}
