"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb, db } from "@/src/lib/db/server";
import { getRoomContext } from "./context";

const PSEUDO = /^[\p{L}\p{N} _-]{2,20}$/u;

/** Salle ciblée par le formulaire (champ room_id), vérifiée côté serveur : membre, ou admin si demandé. */
async function ctx(f: FormData, adminOnly = false) {
  const c = await getRoomContext(String(f.get("room_id")));
  if (!c || (adminOnly && !c.isAdmin)) throw new Error("Non autorisé");
  return { ...c, admin: adminDb() };
}

async function userId() {
  const {
    data: { user },
  } = await (await db()).auth.getUser();
  if (!user) throw new Error("Non connecté");
  return user.id;
}

export async function joinRoom(_prev: string, f: FormData) {
  const uid = await userId();
  const code = String(f.get("code")).trim().toLowerCase();
  const username = String(f.get("username")).trim();
  if (!PSEUDO.test(username)) return "Pseudo : 2 à 20 caractères.";

  const admin = adminDb();
  const { data: room } = await admin.from("rooms").select("id").eq("code", code).maybeSingle();
  if (!room) return "Salle introuvable.";
  const { data: already } = await admin.from("room_members").select("user_id").eq("room_id", room.id).eq("user_id", uid).maybeSingle();
  if (already) redirect(`/r/${room.id}`);
  const { error } = await admin.from("room_members").insert({ room_id: room.id, user_id: uid, username });
  if (error) return "Ce pseudo est déjà pris dans cette salle.";
  redirect(`/r/${room.id}`);
}

export async function createRoom(_prev: string, f: FormData) {
  const uid = await userId();
  const name = String(f.get("name")).trim().slice(0, 60);
  const username = String(f.get("username")).trim();
  if (!name) return "Donne un nom à la salle.";
  if (!PSEUDO.test(username)) return "Pseudo : 2 à 20 caractères.";

  const admin = adminDb();
  const code = Math.random().toString(36).slice(2, 8);
  const { data: room, error } = await admin.from("rooms").insert({ name, code }).select("id").single();
  if (error) return "Création impossible, réessaie.";
  await admin.from("room_members").insert({ room_id: room.id, user_id: uid, username, role: "admin" });
  redirect(`/r/${room.id}/manage`);
}

/** Photo de profil (target=user, propre à la salle) ou de salle (target=room, admin). */
export async function setAvatar(f: FormData) {
  const target = f.get("target") === "room" ? "room" : "user";
  const c = await ctx(f, target === "room");
  const file = f.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 2_000_000) return;

  const path = target === "room" ? `room/${c.roomId}` : `user/${c.roomId}-${c.user.id}`;
  const { error } = await c.admin.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (error) return;
  const url = `${c.admin.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  if (target === "room") await c.admin.from("rooms").update({ avatar_url: url }).eq("id", c.roomId);
  else await c.admin.from("room_members").update({ avatar_url: url }).eq("room_id", c.roomId).eq("user_id", c.user.id);
  revalidatePath("/", "layout");
}

export async function renameRoom(f: FormData) {
  const c = await ctx(f, true);
  const name = String(f.get("name")).trim().slice(0, 60);
  if (name) await c.admin.from("rooms").update({ name }).eq("id", c.roomId);
  revalidatePath("/", "layout");
}

export async function changeCode(_prev: string, f: FormData) {
  const c = await ctx(f, true);
  const code = String(f.get("code")).trim().toLowerCase();
  if (!/^[a-z0-9-]{4,20}$/.test(code)) return "Code : 4 à 20 lettres, chiffres ou -.";
  const { error } = await c.admin.from("rooms").update({ code }).eq("id", c.roomId);
  if (error) return error.code === "23505" ? "Ce code est déjà pris." : `Erreur : ${error.message}`;
  revalidatePath("/", "layout");
  return "Code modifié.";
}

export async function setRole(f: FormData) {
  const c = await ctx(f, true);
  const target = String(f.get("user_id"));
  const role = f.get("role") === "admin" ? "admin" : "member";
  const admins = c.members.filter((m) => m.role === "admin");
  if (role === "member" && admins.length === 1 && admins[0].user_id === target) return; // dernier admin
  await c.admin.from("room_members").update({ role }).eq("room_id", c.roomId).eq("user_id", target);
  revalidatePath("/", "layout");
}

/** Exclut un membre de la salle (son compte reste valable pour ses autres salles). */
export async function kick(f: FormData) {
  const c = await ctx(f, true);
  const target = String(f.get("user_id"));
  if (target === c.user.id || !c.names[target]) return;
  await c.admin.from("room_members").delete().eq("room_id", c.roomId).eq("user_id", target);
  revalidatePath("/", "layout");
}

export async function deleteRoom(f: FormData) {
  const c = await ctx(f, true);
  await c.admin.from("rooms").delete().eq("id", c.roomId);
  redirect("/");
}

/** Quitter une salle. Le dernier admin ne peut partir que s'il est seul (la salle est alors supprimée). */
export async function leaveRoom(f: FormData) {
  const c = await ctx(f);
  const others = c.members.filter((m) => m.user_id !== c.user.id);
  const lastAdmin = c.isAdmin && !others.some((m) => m.role === "admin");
  if (lastAdmin && others.length) return;
  if (others.length) await c.admin.from("room_members").delete().eq("room_id", c.roomId).eq("user_id", c.user.id);
  else await c.admin.from("rooms").delete().eq("id", c.roomId);
  redirect("/");
}
