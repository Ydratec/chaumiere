"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { adminDb } from "@/src/lib/db/server";
import { isSuperAdmin } from "@/src/modules/admin/guard";
import { notify } from "@/src/modules/notifications/push";
import { getAuthUser, getRoomContext } from "@/src/modules/rooms/context";
import { FEEDBACKS_PER_DAY, MAX_TEXT, WISH_PRICE } from "./constants";

/** Identifiants des super-admins (pour les prévenir d'un nouveau retour). */
async function adminIds() {
  const { data } = await adminDb().auth.admin.listUsers({ perPage: 200 });
  return (data?.users ?? []).filter((u) => isSuperAdmin({ email: u.email })).map((u) => u.id);
}

function warn(who: string, kind: "feedback" | "wish", text: string) {
  after(async () =>
    notify(await adminIds(), "admin", {
      title: kind === "wish" ? `Vœu de ${who}` : `Retour de ${who}`,
      body: text.slice(0, 120),
      url: "/",
      tag: `feedback-${kind}`,
    }),
  );
}

/** Un retour libre (bug, idée, remarque), gratuit : limité à quelques-uns par jour. */
export async function sendFeedback(roomId: string, raw: string): Promise<string> {
  const c = await getRoomContext(roomId);
  if (!c) return "Non autorisé.";
  const text = raw.trim().slice(0, MAX_TEXT);
  if (!text) return "Écris quelque chose d'abord.";
  const admin = adminDb();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from("feedback").select("id", { count: "exact", head: true }).eq("user_id", c.user.id).eq("kind", "feedback").gte("created_at", since);
  if ((count ?? 0) >= FEEDBACKS_PER_DAY) return "Déjà plusieurs retours aujourd'hui : reviens demain !";
  const { error } = await admin.from("feedback").insert({ room_id: roomId, user_id: c.user.id, kind: "feedback", text });
  if (error) return "Envoi impossible pour l'instant.";
  warn(c.names[c.user.id], "feedback", text);
  return "";
}

/** Une demande spéciale payée très cher : « ajoute ceci au jeu ». */
export async function makeWish(roomId: string, raw: string): Promise<string> {
  const c = await getRoomContext(roomId);
  if (!c) return "Non autorisé.";
  const text = raw.trim().slice(0, MAX_TEXT);
  if (!text) return "Décris ce que tu voudrais voir dans le jeu.";
  const { error } = await adminDb().rpc("farm_wish", { r: roomId, u: c.user.id, price: WISH_PRICE, txt: text });
  if (error) return error.code === "23514" ? "Pas assez de pièces (il en faut beaucoup !)." : "Envoi impossible pour l'instant.";
  warn(c.names[c.user.id], "wish", text);
  revalidatePath(`/r/${roomId}`, "layout");
  return "";
}

/** Marque un retour comme traité (super-admin seulement). */
export async function markDone(id: number, roomId: string) {
  const user = await getAuthUser();
  if (!isSuperAdmin(user)) throw new Error("Non autorisé");
  await adminDb().from("feedback").update({ done: true }).eq("id", id);
  revalidatePath(`/r/${roomId}`);
}
