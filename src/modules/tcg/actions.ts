"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/src/lib/db/server";
import { challengeDay, yesterdayOf } from "@/src/modules/challenges/data";
import { getRoomContext } from "@/src/modules/rooms/context";
import { BOOSTER, claimKey, drawBooster, testBooster, type Source } from "./cards";
import { answeredToday, wonYesterday } from "./data";

/** Prend une place (une ligne farm_stats) : false si elle est déjà prise. La clé primaire de la table garantit qu'on ne la prend qu'une fois. */
async function claim(roomId: string, uid: string, key: string) {
  const { error } = await adminDb().from("farm_stats").insert({ room_id: roomId, user_id: uid, key, count: 1 });
  if (error && error.code !== "23505") throw error;
  return !error;
}

/** Ouvre un booster : celui de la question du jour, celui du gagnant du défi d'hier, ou un acheté (3 par jour).
 *  Le serveur vérifie le droit, le marque comme pris, puis tire les cartes.
 *  `test` (en local seulement) : booster gratuit avec des versions alternatives, pour voir les effets.
 *  ponytail: la collection vit dans le navigateur (V1 locale) ; table Supabase quand on la veut sur tous les appareils. */
export async function openBooster(roomId: string, source: Source | "test"): Promise<{ cards?: string[]; error?: string }> {
  const c = await getRoomContext(roomId);
  if (!c) return { error: "Non autorisé." };
  const uid = c.user.id, day = challengeDay();

  if (source === "test") return process.env.NODE_ENV === "production" ? { error: "Indisponible." } : { cards: testBooster() };

  if (source === "question") {
    if (!(await answeredToday(c.sb, roomId, uid))) return { error: "Réponds d'abord à la question du jour." };
    if (!(await claim(roomId, uid, claimKey.question(day)))) return { error: "Tu as déjà ouvert ce booster aujourd'hui." };
  } else if (source === "win") {
    if (!(await wonYesterday(roomId, uid))) return { error: "Ce booster est pour le gagnant du défi d'hier." };
    if (!(await claim(roomId, uid, claimKey.win(yesterdayOf(day))))) return { error: "Tu as déjà ouvert ce booster." };
  } else {
    // Première place libre parmi les achats du jour, puis on paie ; si le paiement échoue, on rend la place.
    let slot = 0;
    for (let n = 1; n <= BOOSTER.perDay && !slot; n++) if (await claim(roomId, uid, claimKey.buy(day, n))) slot = n;
    if (!slot) return { error: `Tu as déjà acheté ${BOOSTER.perDay} boosters aujourd'hui.` };
    const { error } = await adminDb().rpc("farm_add_items", { r: roomId, u: uid, delta: { coins: -BOOSTER.price } });
    if (error) {
      await adminDb().from("farm_stats").delete().eq("room_id", roomId).eq("user_id", uid).eq("key", claimKey.buy(day, slot));
      return { error: error.code === "23514" ? "Pas assez de pièces." : "Achat impossible pour l'instant." };
    }
  }
  revalidatePath(`/r/${roomId}`, "layout");
  return { cards: drawBooster() };
}
