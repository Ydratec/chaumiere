// Boîte de réception du super-admin (serveur uniquement, pas une server action).
import { adminDb } from "@/src/lib/db/server";

export type Inbox = { id: number; kind: "feedback" | "wish"; text: string; at: string; who: string; room: string }[];

/** Retours pas encore traités, de toutes les salles, du plus récent au plus ancien. */
export async function loadInbox(): Promise<Inbox> {
  const admin = adminDb();
  const { data } = await admin.from("feedback").select("id, room_id, user_id, kind, text, created_at").eq("done", false).order("created_at", { ascending: false }).limit(30);
  if (!data?.length) return [];
  const [{ data: members }, { data: rooms }] = await Promise.all([
    admin.from("room_members").select("room_id, user_id, username").in("user_id", [...new Set(data.map((f) => f.user_id))]),
    admin.from("rooms").select("id, name").in("id", [...new Set(data.map((f) => f.room_id))]),
  ]);
  return data.map((f) => ({
    id: f.id,
    kind: f.kind,
    text: f.text,
    at: f.created_at,
    who: members?.find((m) => m.room_id === f.room_id && m.user_id === f.user_id)?.username ?? "?",
    room: rooms?.find((r) => r.id === f.room_id)?.name ?? "?",
  }));
}
