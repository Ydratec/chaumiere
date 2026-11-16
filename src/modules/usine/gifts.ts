"use server";
// Cadeaux de fleurs depuis l'Usine de Noël : les mêmes que dans l'ancienne serre (table farm_gifts, fonctions farm_gift
// et farm_open_gift). On offre avec giveGift (src/modules/farm/actions.ts) ; ici, ce qu'il faut autour.
import { adminDb } from "@/src/lib/db/server";
import type { Inventory } from "@/src/modules/farm/catalog";
import { giftedToday, type Gift } from "@/src/modules/farm/data";
import { FLOWERS } from "@/src/modules/farm/flowers";
import { getRoomContext } from "@/src/modules/rooms/context";

/** Avant d'offrir à `receiver` : mes fleurs, et si je lui ai déjà fait un cadeau aujourd'hui. */
export async function giftInfo(roomId: string, receiver: string): Promise<{ items: Inventory; done: boolean } | null> {
  const c = await getRoomContext(roomId);
  if (!c || receiver === c.user.id || !c.names[receiver]) return null;
  const [{ data }, done] = await Promise.all([
    adminDb().from("farm_items").select("item, qty").eq("room_id", roomId).eq("user_id", c.user.id).in("item", FLOWERS.map((f) => f.id)).gt("qty", 0),
    giftedToday(roomId, c.user.id, receiver),
  ]);
  return { items: Object.fromEntries((data ?? []).map((r) => [r.item, r.qty])) as Inventory, done };
}

/** Ouvrir un cadeau reçu : comme dans la serre, ses fleurs rejoignent la collection et l'album. Renvoie le cadeau (qui, quel mot). */
export async function openFlowerGift(roomId: string, giftId: number): Promise<Gift | null> {
  const c = await getRoomContext(roomId);
  if (!c) return null;
  const { data } = await adminDb().rpc("farm_open_gift", { gid: Number(giftId), rcv: c.user.id });
  return (data as Gift[] | null)?.[0] ?? null;
}
