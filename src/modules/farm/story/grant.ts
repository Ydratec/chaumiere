// Remise d'un secret trouvé (serveur uniquement, pas une server action).
import { adminDb } from "@/src/lib/db/server";
import { SECRETS } from "./secrets";

/** Enregistre le secret (une seule fois) et verse sa récompense. Renvoie le message à afficher, ou null s'il était déjà trouvé. */
export async function grantSecret(roomId: string, uid: string, id: string) {
  const s = SECRETS.find((x) => x.id === id);
  if (!s) return null;
  const admin = adminDb();
  const { error } = await admin.from("farm_secrets").insert({ room_id: roomId, user_id: uid, secret: id });
  if (error) return null;
  await admin.rpc("farm_add_items", { r: roomId, u: uid, delta: { coins: s.coins } });
  const { count } = await admin.from("farm_secrets").select("secret", { count: "exact", head: true }).eq("room_id", roomId).eq("user_id", uid);
  return `Secret trouvé : « ${s.title} » (+${s.coins} pièces). ${count} secret${(count ?? 0) > 1 ? "s" : ""} trouvé${(count ?? 0) > 1 ? "s" : ""} en tout.`;
}
