// Lecture côté serveur (pas une server action : jamais appelable du client).
import { adminDb } from "@/src/lib/db/server";

/** Espèces et accessoires achetés par ce membre dans cette salle. */
export async function loadOwnedSkins(roomId: string, uid: string) {
  const { data } = await adminDb().from("farm_items").select("item").eq("room_id", roomId).eq("user_id", uid).like("item", "skin:%").gt("qty", 0);
  return (data ?? []).map((r) => r.item as string);
}
