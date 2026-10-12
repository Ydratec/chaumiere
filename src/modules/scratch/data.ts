// Tickets non grattés d'un joueur (serveur uniquement, pas une server action).
import { adminDb } from "@/src/lib/db/server";
import type { Card } from "./actions";
import type { Layout } from "./tickets";

export async function loadPending(roomId: string, uid: string): Promise<Card[]> {
  const { data } = await adminDb().from("scratch_cards").select("id, kind, layout")
    .eq("room_id", roomId).eq("user_id", uid).eq("claimed", false).order("id").limit(10);
  return (data ?? []).map((c) => ({ id: c.id as number, kind: c.kind as string, layout: c.layout as Layout }));
}
