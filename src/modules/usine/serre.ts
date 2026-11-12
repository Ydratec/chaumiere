"use server";
// La serre ferme : l'Usine de Noël la remplace. Une seule fois par joueur, tout ce qu'il avait est vendu au prix
// du marché de la serre (pièces de la salle), sauf les fleurs, qu'il garde (la serre de l'usine en refait pousser).
import { adminDb } from "@/src/lib/db/server";
import { ITEMS, type ItemId } from "@/src/modules/farm/catalog";
import { isFlower } from "@/src/modules/farm/flowers";
import { getRoomContext } from "@/src/modules/rooms/context";

const SERRE_SOLD_KEY = "usine:serre-vendue"; // ligne farm_stats : la clé primaire garantit qu'on ne vend qu'une fois

export type SerreSale = { coins: number; sold: number; flowers: number };

export async function closeSerre(roomId: string): Promise<SerreSale | null> {
  const c = await getRoomContext(roomId);
  if (!c) return null;
  const admin = adminDb(), uid = c.user.id;
  const { error: taken } = await admin.from("farm_stats").insert({ room_id: roomId, user_id: uid, key: SERRE_SOLD_KEY, count: 1 });
  if (taken) return null; // déjà fait (ou base indisponible) : pas de pop-up
  const { data } = await admin.from("farm_items").select("item, qty").eq("room_id", roomId).eq("user_id", uid).gt("qty", 0);
  const delta: Record<string, number> = {};
  let coins = 0, sold = 0, flowers = 0;
  for (const { item, qty } of data ?? []) {
    if (isFlower(item)) { flowers += qty; continue; }
    const price = ITEMS[item as ItemId]?.price ?? 0;
    if (item === "coins" || !price) continue; // pièces, tenues, objets sans prix : on garde
    delta[item] = -qty; coins += qty * price; sold += qty;
  }
  if (coins) {
    delta.coins = coins;
    const { error } = await admin.rpc("farm_add_items", { r: roomId, u: uid, delta });
    if (error) { await admin.from("farm_stats").delete().eq("room_id", roomId).eq("user_id", uid).eq("key", SERRE_SOLD_KEY); return null; } // on retentera
  }
  return { coins, sold, flowers };
}

