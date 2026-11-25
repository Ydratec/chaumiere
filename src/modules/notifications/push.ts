// Envoi des notifications push (côté serveur uniquement : pas une server action).
import webpush from "web-push";
import { adminDb } from "@/src/lib/db/server";
import { LIMITS, roomAllowed, type Level } from "./policy";

export type Kind = "question" | "games" | "chat" | "farm" | "quiz";
export type Message = { title: string; body: string; url: string; tag?: string };
/**
 * level : « me » (pour toi, par défaut) ou « room » (ce qui se passe dans la salle, limité : voir policy.ts).
 * topic : sujet pour les limites « salle » (ex. « quiz » : une seule invitation tant qu'on n'est pas revenu).
 * sender : qui provoque l'envoi (une notification « salle » par personne qui envoie toutes les 30 min).
 * skipIfActive : pas de notification si la personne est dans l'appli en ce moment (ex. « À toi de jouer »).
 */
export type Options = { level?: Level; topic?: string; sender?: string; skipIfActive?: boolean };

let ready = false;
function setup() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false; // notifications non configurées : on n'envoie rien
  if (!ready) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://github.com/Ydratec/chaumiere", pub, priv);
  return (ready = true);
}

/** Envoi brut sur tous les appareils de ces personnes (sans préférences ni limites). */
async function deliver(userIds: string[], msg: Message) {
  if (!userIds.length) return;
  const admin = adminDb();
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, user_id, keys").in("user_id", userIds);
  await Promise.all(
    (subs ?? []).map(async (s) => {
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
 * Envoie à ces personnes, sur tous leurs appareils, en respectant leurs préférences et l'anti-spam (policy.ts) :
 * les notifications « salle » sont limitées. « test » et « admin » passent toujours.
 */
export async function notify(userIds: string[], kind: Kind | "test" | "admin", msg: Message, opt: Options = {}) {
  const ids = [...new Set(userIds)];
  if (!ids.length || !setup()) return;
  if (kind === "test" || kind === "admin") return deliver(ids, msg);
  const admin = adminDb(), level = opt.level ?? "me", t = Date.now();
  const since = new Date(t - 24 * 3600_000).toISOString();
  const [{ data: prefs }, { data: seen }, { data: sent }] = await Promise.all([
    admin.from("notification_prefs").select("*").in("user_id", ids),
    admin.from("user_presence").select("user_id, seen_at").in("user_id", ids),
    level === "room" ? admin.from("notification_sent").select("user_id, topic, sender, sent_at").in("user_id", ids).gte("sent_at", since) : Promise.resolve({ data: [] }),
  ]);
  const pref = new Map((prefs ?? []).map((p) => [p.user_id as string, p]));
  const lastSeen = new Map((seen ?? []).map((p) => [p.user_id as string, Date.parse(p.seen_at)]));
  const send: string[] = [], logged: string[] = [];
  for (const u of ids) {
    const p = pref.get(u);
    if (p && (p[kind] === false || (level === "room" && p.room === false))) continue;
    const s = lastSeen.get(u) ?? 0;
    if (opt.skipIfActive && s > t - LIMITS.activeMinutes * 60_000) continue; // déjà dans l'appli
    if (level === "room") {
      const mine = (sent ?? []).filter((x) => x.user_id === u).map((x) => ({ topic: x.topic as string, sender: x.sender as string | null, at: Date.parse(x.sent_at) }));
      if (!roomAllowed({ sent: mine, seen: s, now: t, topic: opt.topic ?? kind, sender: opt.sender })) continue;
      logged.push(u);
    }
    send.push(u);
  }
  if (logged.length) {
    await admin.from("notification_sent").delete().lt("sent_at", new Date(t - 2 * 86_400_000).toISOString()); // ménage
    await admin.from("notification_sent").insert(logged.map((user_id) => ({ user_id, topic: opt.topic ?? kind, sender: opt.sender ?? null })));
  }
  await deliver(send, msg);
}

/** Note que la personne est dans l'appli (remet à zéro les limites « salle » ; au plus une écriture par minute). */
export async function touchPresence(userId: string) {
  await adminDb().rpc("touch_presence", { u: userId });
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
