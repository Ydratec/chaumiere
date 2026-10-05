"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb, db } from "@/src/lib/db/server";

/**
 * Pseudo + PIN + code salon. Le compte Supabase est créé à la première connexion :
 * email synthétique (pseudo + id du salon), mot de passe = PIN + AUTH_PEPPER.
 */
export async function login(_prev: string, f: FormData) {
  const username = String(f.get("username")).trim().toLowerCase();
  const pin = String(f.get("pin"));
  const code = String(f.get("code")).trim().toLowerCase();

  if (!/^[a-z0-9_-]{2,20}$/.test(username)) return "Identifiant : 2 à 20 lettres, chiffres, - ou _.";
  if (!/^\d{4}$/.test(pin)) return "Le PIN doit contenir exactement 4 chiffres.";

  const admin = adminDb();
  const { data: room } = await admin.from("rooms").select("id").eq("code", code).maybeSingle();
  if (!room) return "Salle introuvable.";

  const email = `${username}.${room.id}@chaumiere.local`;
  const password = pin + process.env.AUTH_PEPPER;
  const sb = await db();

  // ponytail: pas de limite de tentatives maison (4 chiffres = 10 000 essais) ; ajouter un compteur si exposé publiquement.
  let { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) return "PIN incorrect.";
    await admin
      .from("room_members")
      .insert({ room_id: room.id, user_id: created.data.user.id, username });
    ({ error } = await sb.auth.signInWithPassword({ email, password }));
    if (error) return "Connexion impossible.";
  }
  redirect("/");
}

export async function logout() {
  await (await db()).auth.signOut();
  redirect("/");
}

export async function answer(f: FormData) {
  const sb = await db();
  await sb.from("answers").upsert({
    activity_id: String(f.get("activity_id")),
    content: String(f.get("content")).trim().slice(0, 500),
  });
  revalidatePath("/");
}
