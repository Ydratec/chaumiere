"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/src/lib/db/server";
import { getRoomContext } from "@/src/modules/rooms/context";
import { BOOSTER, drawBooster } from "./cards";

/** Achète un booster : le serveur débite les pièces et tire les cartes.
 *  ponytail: la collection vit dans le navigateur (V1 locale) ; table Supabase quand on la veut sur tous les appareils. */
export async function openBooster(roomId: string): Promise<{ cards?: string[]; error?: string }> {
  const c = await getRoomContext(roomId);
  if (!c) return { error: "Non autorisé." };
  const { error } = await adminDb().rpc("farm_add_items", { r: roomId, u: c.user.id, delta: { coins: -BOOSTER.price } });
  if (error) return { error: error.code === "23514" ? "Pas assez de pièces." : "Achat impossible pour l'instant." };
  revalidatePath(`/r/${roomId}`, "layout");
  return { cards: drawBooster() };
}
