"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/src/lib/db/server";
import { challengeDay, yesterdayOf } from "@/src/modules/challenges/data";
import { getRoomContext } from "@/src/modules/rooms/context";
import { BOOSTER, claimKey, drawBooster, testBooster, toImport, type Owned, type Source } from "./cards";
import { answeredToday, loadCollection, wonYesterday } from "./data";

/** Prend une place (une ligne farm_stats) : false si elle est déjà prise. La clé primaire de la table garantit qu'on ne la prend qu'une fois. */
async function claim(roomId: string, uid: string, key: string) {
  const { error } = await adminDb().from("farm_stats").insert({ room_id: roomId, user_id: uid, key, count: 1 });
  if (error && error.code !== "23505") throw error;
  return !error;
}

/** Ouvre un booster : celui de la question du jour, celui du gagnant du défi d'hier, ou un acheté (3 par jour).
 *  Le serveur vérifie le droit, le marque comme pris, puis tire les cartes.
 *  `test` (en local seulement) : booster gratuit avec des versions alternatives, pour voir les effets.
 *  Les cartes tirées sont ajoutées à la collection en base (table tcg_cards) ; si ça échoue, on rend le booster (et les pièces). */
export async function openBooster(roomId: string, source: Source | "test"): Promise<{ cards?: string[]; error?: string }> {
  const c = await getRoomContext(roomId);
  if (!c) return { error: "Non autorisé." };
  const uid = c.user.id, day = challengeDay();
  let taken = "", paid = false; // le booster pris (et payé) : rendu si l'enregistrement des cartes échoue

  if (source === "test") return process.env.NODE_ENV === "production" ? { error: "Indisponible." } : { cards: testBooster() };

  if (source === "question") {
    if (!(await answeredToday(c.sb, roomId, uid))) return { error: "Réponds d'abord à la question du jour." };
    if (!(await claim(roomId, uid, claimKey.question(day)))) return { error: "Tu as déjà ouvert ce booster aujourd'hui." };
    taken = claimKey.question(day);
  } else if (source === "win") {
    if (!(await wonYesterday(roomId, uid))) return { error: "Ce booster est pour le gagnant du défi d'hier." };
    if (!(await claim(roomId, uid, claimKey.win(yesterdayOf(day))))) return { error: "Tu as déjà ouvert ce booster." };
    taken = claimKey.win(yesterdayOf(day));
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
    taken = claimKey.buy(day, slot);
    paid = true;
  }
  const cards = drawBooster();
  const { error } = await adminDb().rpc("tcg_add_cards", { r: roomId, u: uid, cards });
  if (error) {
    await adminDb().from("farm_stats").delete().eq("room_id", roomId).eq("user_id", uid).eq("key", taken);
    if (paid) await adminDb().rpc("farm_add_items", { r: roomId, u: uid, delta: { coins: BOOSTER.price } });
    return { error: "Ouverture impossible pour l'instant, réessaie." };
  }
  revalidatePath(`/r/${roomId}`, "layout");
  return { cards };
}

/** Reprend la collection gardée dans ce navigateur (avant que les cartes soient en base), puis renvoie la collection à jour.
 *  La base plafonne la reprise au nombre de cartes des boosters réellement ouverts. */
export async function importLocalCards(roomId: string, local: Owned): Promise<{ owned?: Owned; error?: string }> {
  const c = await getRoomContext(roomId);
  if (!c) return { error: "Non autorisé." };
  const cards = toImport(local);
  if (cards.length) {
    const { error } = await adminDb().rpc("tcg_import", { r: roomId, u: c.user.id, cards, per_booster: BOOSTER.size });
    if (error) return { error: "Reprise impossible pour l'instant." };
  }
  return { owned: await loadCollection(roomId, c.user.id) };
}
