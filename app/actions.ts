"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb, db } from "@/src/lib/db/server";
import { getAuthUser } from "@/src/modules/rooms/context";

/**
 * Identifiant + PIN. Le compte Supabase est créé à la première connexion :
 * email synthétique (identifiant), mot de passe = PIN + AUTH_PEPPER.
 * Le pseudo affiché est choisi à part, salle par salle (room_members.username).
 */
export async function login(_prev: string, f: FormData) {
  const username = String(f.get("username")).trim().toLowerCase();
  const pin = String(f.get("pin"));

  if (!/^[a-z0-9_-]{2,20}$/.test(username)) return "Identifiant : 2 à 20 lettres, chiffres, - ou _.";
  if (!/^\d{4}$/.test(pin)) return "Le PIN doit contenir exactement 4 chiffres.";

  const email = `${username}@chaumiere.local`;
  const password = pin + process.env.AUTH_PEPPER;
  const sb = await db();
  const admin = adminDb();

  // Un PIN à 4 chiffres se devine en 10 000 essais : après 5 échecs, l'identifiant est bloqué 15 minutes.
  const { data: tries } = await admin.from("login_attempts").select("failures, locked_until").eq("username", username).maybeSingle();
  if (tries?.locked_until && Date.parse(tries.locked_until) > Date.now()) return "Trop d'essais : réessaie dans quelques minutes.";

  let { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) {
      const failures = (tries?.locked_until ? 0 : (tries?.failures ?? 0)) + 1; // le compteur repart après un blocage
      await admin.from("login_attempts").upsert({
        username,
        failures,
        locked_until: failures >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null,
      });
      return failures >= 5 ? "Trop d'essais : réessaie dans quelques minutes." : "PIN incorrect.";
    }
    ({ error } = await sb.auth.signInWithPassword({ email, password }));
    if (error) return "Connexion impossible.";
  }
  if (tries) await admin.from("login_attempts").delete().eq("username", username);
  redirect("/");
}

export async function logout() {
  await (await db()).auth.signOut();
  redirect("/");
}

export async function answer(f: FormData) {
  const sb = await db();
  const activityId = String(f.get("activity_id"));
  const content = String(f.get("content")).trim().slice(0, 500);
  // Question de vote : la réponse doit être un membre de la salle, et si la salle l'a choisi, le vote est définitif.
  const { data: a } = await sb.from("daily_activities").select("room_id, payload, rooms(vote_locked)").eq("id", activityId)
    .maybeSingle<{ room_id: string; payload: { kind?: string }; rooms: { vote_locked: boolean } | null }>();
  if (a?.payload?.kind === "vote") {
    const { data: m } = await sb.from("room_members").select("user_id").eq("room_id", a.room_id).eq("user_id", content).maybeSingle();
    if (!m) return;
  }
  if (a?.rooms?.vote_locked) { // réponses définitives (votes comme questions ouvertes)
    const me = await getAuthUser();
    const { data: voted } = await sb.from("answers").select("user_id").eq("activity_id", activityId).eq("user_id", me?.id ?? "").maybeSingle();
    if (voted) return;
  }
  await sb.from("answers").upsert({ activity_id: activityId, content });
  revalidatePath(a ? `/r/${a.room_id}/question` : "/", a ? "page" : "layout"); // seule la page de la question change
}

/** Teinte d'accent personnelle (0-360), lue par app/layout.tsx. */
export async function setHue(hue: number) {
  if (Number.isInteger(hue) && hue >= 0 && hue <= 360)
    (await cookies()).set("hue", String(hue), { path: "/", maxAge: 31536000, sameSite: "lax" });
}
