"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/src/lib/db/server";
import { getRoomContext } from "@/src/modules/rooms/context";
import type { Inventory } from "../catalog";
import { loadFarm } from "../data";
import { chapterOf } from "./index";
import { activeEvents } from "./events";
import { grantSecret } from "./grant";
import { currentQuest, goalMet, goalProgress, scaled } from "./state";

async function member(roomId: string) {
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  return c.user.id;
}
const merge = (a: Inventory, b: Inventory) => {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + (v ?? 0);
  return out;
};

/** Terminer la quête en cours (but atteint) : livre les objets, verse la récompense, ajoute la page du journal. */
export async function completeQuest(roomId: string, questId: string): Promise<{ error?: string }> {
  const uid = await member(roomId);
  const admin = adminDb();
  const farm = await loadFarm(roomId, uid);
  const ch = chapterOf(farm.story.chapter);
  const q = ch && currentQuest(ch, farm.story.done, farm.story.day);
  if (!ch || !q || q.id !== questId) return { error: "Cette quête n'est pas en cours." };
  const { data: stats } = await admin.from("farm_stats").select("key, count").eq("room_id", roomId).eq("user_id", uid);
  const counters = Object.fromEntries((stats ?? []).map((s) => [s.key, s.count as number]));
  if (!goalMet(goalProgress(q.goal, farm.items, farm.tiles, counters, farm.story.catch.cost))) return { error: "Il manque encore quelque chose." };

  let delta: Inventory = { coins: q.reward.coins ?? 0, ...(q.reward.items ?? {}) };
  if (q.goal.kind === "deliver") {
    const pay = Object.fromEntries(Object.entries(scaled(q.goal.items, farm.story.catch.cost)).map(([k, v]) => [k, -(v ?? 0)]));
    delta = merge(delta, pay);
  }
  const { error } = await admin.rpc("farm_quest_complete", { r: roomId, u: uid, ch: ch.n, q: q.id, delta, pg: `${ch.n}:${q.id}` });
  if (error) return { error: error.code === "23505" ? "Déjà terminée." : "Il te manque des objets." };
  revalidatePath(`/r/${roomId}`, "layout");
  return {};
}

/** Livrer une commande du village (récompense ajustée par le rattrapage). */
export async function deliverOrder(roomId: string, orderId: number): Promise<{ error?: string; bonus?: number }> {
  const uid = await member(roomId);
  const admin = adminDb();
  const farm = await loadFarm(roomId, uid);
  const { data: o } = await admin.from("farm_orders").select("reward, done").eq("id", orderId).eq("room_id", roomId).eq("user_id", uid).maybeSingle();
  if (!o || o.done) return { error: "Commande déjà livrée." };
  const pay = Math.max(1, Math.round(o.reward * farm.story.catch.reward));
  const { data: bonus, error } = await admin.rpc("farm_order_deliver", { o: orderId, u: uid, pay });
  if (error) return { error: error.code === "23505" ? "Commande déjà livrée." : "Il te manque des objets." };
  revalidatePath(`/r/${roomId}`, "layout");
  return { bonus: Number(bonus ?? 0) };
}

/** Voir la scène d'un événement en cours : une seule fois, avec un petit cadeau. */
export async function claimEvent(roomId: string, eventId: string): Promise<{ error?: string }> {
  const uid = await member(roomId);
  const admin = adminDb();
  const farm = await loadFarm(roomId, uid);
  const e = activeEvents(farm.story.day).find((x) => x.id === eventId);
  if (!e?.scene) return { error: "Plus rien à voir ici." };
  const { error } = await admin.from("farm_journal").insert({ room_id: roomId, user_id: uid, page: `event:${e.id}` });
  if (error) return { error: "Déjà vu." };
  await admin.rpc("farm_add_items", { r: roomId, u: uid, delta: { coins: e.scene.coins } });
  revalidatePath(`/r/${roomId}`, "layout");
  return {};
}

/** Secrets que l'appareil peut signaler lui-même (les autres sont vérifiés par le serveur à chaque coup). */
const CLIENT_SECRETS = ["chat", "fantome"];
export async function foundSecret(roomId: string, id: string): Promise<string | null> {
  const uid = await member(roomId);
  if (!CLIENT_SECRETS.includes(id)) return null;
  const r = await grantSecret(roomId, uid, id);
  if (r) revalidatePath(`/r/${roomId}`, "layout");
  return r;
}
