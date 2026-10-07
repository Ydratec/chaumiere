"use server";

import { after } from "next/server";
import { adminDb } from "@/src/lib/db/server";
import { getAuthUser, getRoomContext } from "@/src/modules/rooms/context";
import { notify, throttle, type Kind } from "./push";

export type Prefs = Record<Kind, boolean>;

async function me() {
  const user = await getAuthUser();
  if (!user) throw new Error("Non connecté");
  return user.id;
}

/** Enregistre l'abonnement push de cet appareil. */
export async function subscribe(sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }) {
  const uid = await me();
  if (!sub.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return "Abonnement invalide.";
  await adminDb().from("push_subscriptions").upsert({ endpoint: sub.endpoint, user_id: uid, keys: sub.keys });
  return "";
}

export async function unsubscribe(endpoint: string) {
  const uid = await me();
  await adminDb().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", uid);
}

export async function savePrefs(p: Prefs) {
  const uid = await me();
  await adminDb().from("notification_prefs").upsert({
    user_id: uid, question: !!p.question, games: !!p.games, chat: !!p.chat, farm: !!p.farm,
  });
}

export async function sendTest() {
  await notify([await me()], "test", { title: "Chaumière", body: "Les notifications fonctionnent sur cet appareil.", url: "/", tag: "test" });
}

/** Après l'envoi d'un message : prévient les autres membres (au plus une fois toutes les 10 min par discussion). */
export async function chatSent(activityId: string) {
  const admin = adminDb();
  const { data: a } = await admin.from("daily_activities").select("room_id").eq("id", activityId).maybeSingle();
  const c = a && (await getRoomContext(a.room_id));
  if (!c) return;
  const { data: last } = await admin.from("messages").select("content").eq("activity_id", activityId).eq("user_id", c.user.id)
    .order("id", { ascending: false }).limit(1).maybeSingle();
  if (!last) return;
  const others = c.members.map((m) => m.user_id).filter((u) => u !== c.user.id);
  after(async () => {
    const to = await throttle(others, `chat:${activityId}`, 10);
    await notify(to, "chat", {
      title: `${c.names[c.user.id]} · ${c.roomName}`,
      body: last.content.slice(0, 140),
      url: `/r/${a.room_id}/question`,
      tag: `chat-${activityId}`,
    });
  });
}
