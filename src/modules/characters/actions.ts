"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/src/lib/db/server";
import { loadUnlocks } from "@/src/modules/farm/data";
import { getRoomContext } from "@/src/modules/rooms/context";
import { loadOwnedSkins } from "./data";
import { ACCESSORIES, SPECIES, canWear, readCharacter, skinKey, type Character } from "./catalog";

async function member(roomId: string) {
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  return c.user.id;
}

/** Change son personnage (seulement avec ce qu'on a débloqué). */
export async function saveCharacter(roomId: string, raw: Character) {
  const uid = await member(roomId);
  const c = readCharacter(raw, "");
  if (c.species !== raw.species || c.color !== raw.color || c.accessory !== (raw.accessory ?? null)) return "Personnage invalide.";
  if (!canWear(c, await loadOwnedSkins(roomId, uid), await loadUnlocks(roomId))) return "À débloquer d'abord.";
  await adminDb().from("room_members").update({ character: c }).eq("room_id", roomId).eq("user_id", uid);
  revalidatePath(`/r/${roomId}`, "layout");
  return "";
}

/** Achète une espèce ou un accessoire avec les pièces de la serre. */
export async function buySkin(roomId: string, kind: "species" | "accessory", id: string) {
  const uid = await member(roomId);
  const price = kind === "species" ? SPECIES[id as keyof typeof SPECIES]?.price : ACCESSORIES[id]?.requires ? undefined : ACCESSORIES[id]?.price;
  if (price === undefined) return "Pas à vendre.";
  const key = skinKey(kind, id);
  if ((await loadOwnedSkins(roomId, uid)).includes(key) || price === 0) return "";
  const { error } = await adminDb().rpc("farm_add_items", { r: roomId, u: uid, delta: { coins: -price, [key]: 1 } });
  return error ? "Pas assez de pièces (gagne-en à la serre)." : "";
}
