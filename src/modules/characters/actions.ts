"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notify } from "@/src/modules/notifications/push";
import { adminDb } from "@/src/lib/db/server";
import { loadUnlocks } from "@/src/modules/farm/data";
import { getRoomContext } from "@/src/modules/rooms/context";
import { loadOwnedSkins } from "./data";
import { ACCESSORIES, SPECIES, canWear, isUnique, readCharacter, skinKey, type Character } from "./catalog";

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
  const price = kind === "species" ? (isUnique(id) ? undefined : SPECIES[id as keyof typeof SPECIES]?.price) : ACCESSORIES[id]?.requires ? undefined : ACCESSORIES[id]?.price;
  if (price === undefined) return "Pas à vendre.";
  const key = skinKey(kind, id);
  if ((await loadOwnedSkins(roomId, uid)).includes(key) || price === 0) return "";
  const { error } = await adminDb().rpc("farm_add_items", { r: roomId, u: uid, delta: { coins: -price, [key]: 1 } });
  return error ? "Pas assez de pièces (gagne-en à la serre)." : "";
}

/**
 * Admin de la salle : donne un personnage unique à un membre (ou le retire à tout le monde, `user_id` vide).
 * Un seul exemplaire par salle : l'ancien propriétaire le perd (il redevient chat s'il le portait). Le nouveau le porte tout de suite.
 */
export async function giveUnique(f: FormData) {
  const roomId = String(f.get("room_id")), species = String(f.get("species")), target = String(f.get("user_id") ?? "");
  const c = await getRoomContext(roomId);
  if (!c?.isAdmin || !isUnique(species) || (target && !c.names[target])) return;
  const admin = adminDb();
  const key = skinKey("species", species);
  await admin.from("farm_items").update({ qty: 0 }).eq("room_id", roomId).eq("item", key);
  // ceux qui le portaient (sauf le nouveau propriétaire) redeviennent des chats, avec leur couleur et leur accessoire
  for (const m of c.members) {
    if (m.user_id !== target && m.character.species === species)
      await admin.from("room_members").update({ character: { ...m.character, species: "cat" } }).eq("room_id", roomId).eq("user_id", m.user_id);
  }
  if (target) {
    await admin.rpc("farm_add_items", { r: roomId, u: target, delta: { [key]: 1 } });
    const now = c.members.find((m) => m.user_id === target)!.character;
    await admin.from("room_members").update({ character: { ...now, species } }).eq("room_id", roomId).eq("user_id", target);
    if (target !== c.user.id)
      after(() => notify([target], "farm", { title: "Un personnage rien qu'à toi ✨", body: `${c.names[c.user.id]} t'a donné : ${SPECIES[species as keyof typeof SPECIES].name}.`, url: `/r/${roomId}/profile`, tag: `unique-${species}` }));
  }
  revalidatePath(`/r/${roomId}`, "layout");
}
