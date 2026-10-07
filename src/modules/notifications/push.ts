// Envoi des notifications push (côté serveur uniquement : pas une server action).
import webpush from "web-push";
import { adminDb } from "@/src/lib/db/server";

export type Kind = "question" | "games" | "chat" | "farm";
export type Message = { title: string; body: string; url: string; tag?: string };

let ready = false;
function setup() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false; // notifications non configurées : on n'envoie rien
  if (!ready) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://github.com/Ydratec/chaumiere", pub, priv);
  return (ready = true);
}

/** Envoie à ces personnes (celles qui n'ont pas coupé ce type ; « test » ignore les préférences), sur tous leurs appareils. */
export async function notify(userIds: string[], kind: Kind | "test", msg: Message) {
  const ids = [...new Set(userIds)];
  if (!ids.length || !setup()) return;
  const admin = adminDb();
  const [{ data: prefs }, { data: subs }] = await Promise.all([
    admin.from("notification_prefs").select("*").in("user_id", ids),
    admin.from("push_subscriptions").select("endpoint, user_id, keys").in("user_id", ids),
  ]);
  const off = new Set((prefs ?? []).filter((p) => kind !== "test" && p[kind] === false).map((p) => p.user_id));
  await Promise.all(
    (subs ?? []).filter((s) => !off.has(s.user_id)).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(msg), { TTL: 3600 });
      } catch (e) {
        // abonnement expiré ou révoqué : on l'oublie
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }),
  );
}

/**
 * Anti-spam : garde seulement les personnes à qui on n'a rien envoyé sur ce sujet depuis `minutes`
 * (Infinity = jamais), et note l'envoi.
 */
export async function throttle(userIds: string[], key: string, minutes = Infinity) {
  if (!userIds.length) return [];
  const admin = adminDb();
  const { data } = await admin.from("notification_log").select("user_id, sent_at").eq("key", key).in("user_id", userIds);
  const since = Date.now() - minutes * 60_000;
  const recent = new Set((data ?? []).filter((l) => minutes === Infinity || Date.parse(l.sent_at) > since).map((l) => l.user_id));
  const allowed = userIds.filter((u) => !recent.has(u));
  if (allowed.length)
    await admin.from("notification_log").upsert(allowed.map((user_id) => ({ user_id, key, sent_at: new Date().toISOString() })));
  return allowed;
}

/** Membres d'une salle, sauf `except`. */
export async function roomMembers(roomId: string, except?: string) {
  const { data } = await adminDb().from("room_members").select("user_id").eq("room_id", roomId);
  return (data ?? []).map((m) => m.user_id as string).filter((u) => u !== except);
}
