// Envoi des notifications push (côté serveur uniquement : pas une server action).
import webpush from "web-push";
import { adminDb } from "@/src/lib/db/server";
import { digest, isQuiet, LIMITS, roomAllowed, type Level } from "./policy";

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
 * les notifications « salle » sont limitées et ne partent pas la nuit ; celles « pour toi » attendent le matin
 * (résumé envoyé par le cron). « test » et « admin » passent toujours.
 */
export async function notify(userIds: string[], kind: Kind | "test" | "admin", msg: Message, opt: Options = {}) {
  const ids = [...new Set(userIds)];
  if (!ids.length || !setup()) return;
  if (kind === "test" || kind === "admin") return deliver(ids, msg);
  const admin = adminDb(), level = opt.level ?? "me", now = new Date(), t = now.getTime();
  const since = new Date(t - 24 * 3600_000).toISOString();
  const [{ data: prefs }, { data: seen }, { data: sent }] = await Promise.all([
    admin.from("notification_prefs").select("*").in("user_id", ids),
    admin.from("user_presence").select("user_id, seen_at").in("user_id", ids),
    level === "room" ? admin.from("notification_sent").select("user_id, topic, sender, sent_at").in("user_id", ids).gte("sent_at", since) : Promise.resolve({ data: [] }),
  ]);
  const pref = new Map((prefs ?? []).map((p) => [p.user_id as string, p]));
  const lastSeen = new Map((seen ?? []).map((p) => [p.user_id as string, Date.parse(p.seen_at)]));
  const send: string[] = [], later: string[] = [], logged: string[] = [];
  for (const u of ids) {
    const p = pref.get(u);
    if (p && (p[kind] === false || (level === "room" && p.room === false))) continue;
    const quiet = p?.quiet !== false && isQuiet(now), s = lastSeen.get(u) ?? 0;
    if (opt.skipIfActive && s > t - LIMITS.activeMinutes * 60_000) continue; // déjà dans l'appli
    if (level === "room") {
      if (quiet) continue; // la nuit, rien de la salle
      const mine = (sent ?? []).filter((x) => x.user_id === u).map((x) => ({ topic: x.topic as string, sender: x.sender as string | null, at: Date.parse(x.sent_at) }));
      if (!roomAllowed({ sent: mine, seen: s, now: t, topic: opt.topic ?? kind, sender: opt.sender })) continue;
      logged.push(u);
    } else if (quiet) { later.push(u); continue; }
    send.push(u);
  }
  await Promise.all([
    logged.length ? admin.from("notification_sent").insert(logged.map((user_id) => ({ user_id, topic: opt.topic ?? kind, sender: opt.sender ?? null }))) : null,
    later.length ? admin.from("notification_queue").insert(later.map((user_id) => ({ user_id, title: msg.title, body: msg.body, url: msg.url }))) : null,
  ]);
  await deliver(send, msg);
}

/** Cron, le matin : un seul résumé par personne pour tout ce qui est arrivé pendant les heures calmes. */
export async function sendDigests() {
  if (isQuiet(new Date())) return 0;
  const admin = adminDb();
  await admin.from("notification_sent").delete().lt("sent_at", new Date(Date.now() - 2 * 86_400_000).toISOString()); // ménage
  const { data } = await admin.from("notification_queue").select("id, user_id, title, body, url").order("id").limit(1000);
  if (!data?.length || !setup()) return 0;
  const byUser = new Map<string, typeof data>();
  for (const r of data) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);
  await admin.from("notification_queue").delete().in("id", data.map((r) => r.id));
  await Promise.all([...byUser].map(([u, items]) => deliver([u], digest(items))));
  return byUser.size;
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
