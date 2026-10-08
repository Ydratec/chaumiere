"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/src/lib/db/server";
import { ACCESSORIES, SPECIES, skinKey } from "@/src/modules/characters/catalog";
import { ITEMS, isItem } from "@/src/modules/farm/catalog";
import { PROJECTS } from "@/src/modules/farm/projects";
import { getRoomContext } from "@/src/modules/rooms/context";
import { questionDay } from "@/src/modules/questions/day";
import { isSuperAdmin } from "./guard";

/** Outils de test : réservés aux super-admins (SUPERADMINS), vérifiés à chaque appel. */
async function guard(roomId: string) {
  const c = await getRoomContext(roomId);
  if (!c || !isSuperAdmin(c.user)) throw new Error("Non autorisé");
  return { admin: adminDb(), uid: c.user.id };
}
const done = (roomId: string, msg: string) => {
  revalidatePath(`/r/${roomId}`, "layout");
  return msg;
};

export async function giveItems(roomId: string, item: string, qty: number) {
  const { admin, uid } = await guard(roomId);
  const n = Math.floor(qty);
  if (!isItem(item) || !(n > 0 && n <= 100_000)) return "Objet ou quantité invalide.";
  const { error } = await admin.rpc("farm_add_items", { r: roomId, u: uid, delta: { [item]: n } });
  return done(roomId, error ? error.message : `+${n} ${ITEMS[item].name.toLowerCase()}`);
}

export async function finishTimers(roomId: string) {
  const { admin, uid } = await guard(roomId);
  const now = new Date().toISOString();
  const { data } = await admin.from("farm_tiles").update({ ready_at: now }).eq("room_id", roomId).eq("user_id", uid).not("item", "is", null).select("x");
  return done(roomId, `${data?.length ?? 0} production(s) terminée(s).`);
}

export async function unlockAll(roomId: string) {
  const { admin } = await guard(roomId);
  await admin.from("room_unlocks").upsert(PROJECTS.map((p) => ({ room_id: roomId, key: p.key })), { ignoreDuplicates: true });
  return done(roomId, "Tous les projets sont débloqués pour la salle.");
}

export async function resetUnlocks(roomId: string) {
  const { admin } = await guard(roomId);
  await admin.from("room_unlocks").delete().eq("room_id", roomId);
  await admin.from("farm_contributions").delete().eq("room_id", roomId);
  return done(roomId, "Déblocages et dons de la salle remis à zéro.");
}

export async function unlockSkins(roomId: string) {
  const { admin, uid } = await guard(roomId);
  const keys = [
    ...Object.keys(SPECIES).map((s) => skinKey("species", s)),
    ...Object.keys(ACCESSORIES).filter((a) => !ACCESSORIES[a].requires).map((a) => skinKey("accessory", a)),
  ];
  await admin.from("farm_items").upsert(keys.map((item) => ({ room_id: roomId, user_id: uid, item, qty: 1 })), { onConflict: "room_id,user_id,item" });
  return done(roomId, "Toutes les espèces et accessoires sont à toi.");
}

export async function resetFarm(roomId: string) {
  const { admin, uid } = await guard(roomId);
  await admin.from("farm_tiles").delete().eq("room_id", roomId).eq("user_id", uid);
  await admin.from("farm_items").delete().eq("room_id", roomId).eq("user_id", uid).not("item", "like", "skin:%");
  await admin.from("farm_cats").delete().eq("room_id", roomId).eq("user_id", uid);
  return done(roomId, "Ta serre repart de zéro (elle sera recréée à la prochaine visite).");
}

/** Remplace la question du jour (supprime ses réponses et sa discussion). */
export async function newQuestion(roomId: string, kind: "open" | "vote") {
  const { admin } = await guard(roomId);
  const { data: room } = await admin.from("rooms").select("question_hour").eq("id", roomId).single();
  const day = questionDay(room?.question_hour ?? 0);
  const { data: qs } = await admin.from("questions").select("id, text, kind").eq("kind", kind);
  if (!qs?.length) return kind === "vote" ? "Aucune question de vote : lance la migration 0013." : "Aucune question.";
  const q = qs[Math.floor(Math.random() * qs.length)];
  await admin.from("daily_activities").delete().eq("room_id", roomId).eq("day", day).eq("type", "question").eq("slot", 0);
  const { error } = await admin.from("daily_activities").insert({ room_id: roomId, day, type: "question", payload: { qid: q.id, text: q.text, kind: q.kind } });
  return done(roomId, error ? error.message : `Nouvelle question : « ${q.text} »`);
}
