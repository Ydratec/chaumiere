// Cueillette d'une fleur dans la serre de l'usine : le serveur tire la fleur (comme la serre) et l'ajoute à l'inventaire
// de la salle. Plafond par jour (heure de Paris), pour que le jeu, qui tourne dans le navigateur, ne puisse pas en créer à volonté.
// ponytail: compteur lu puis incrémenté (deux cueillettes simultanées peuvent dépasser d'une fleur) ; une fonction SQL si ça compte.
import { adminDb } from "@/src/lib/db/server";
import { challengeDay } from "@/src/modules/challenges/data";
import { ITEMS } from "@/src/modules/farm/catalog";
import { pickFlower } from "@/src/modules/farm/flowers";
import { getRoomContext } from "@/src/modules/rooms/context";

export const dynamic = "force-dynamic";
const PER_DAY = 8;

export async function POST(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const admin = adminDb(), uid = ctx.user.id, key = `usine:fleurs:${challengeDay()}`;
  const { data } = await admin.from("farm_stats").select("count").eq("room_id", roomId).eq("user_id", uid).eq("key", key).maybeSingle();
  if ((data?.count ?? 0) >= PER_DAY) return Response.json({ error: `Tu as déjà cueilli ${PER_DAY} fleurs aujourd'hui : reviens demain !` }, { status: 429 });
  const flower = pickFlower();
  const [{ error }] = await Promise.all([
    admin.rpc("farm_add_items", { r: roomId, u: uid, delta: { [flower]: 1 } }),
    admin.rpc("farm_stat_add", { r: roomId, u: uid, k: key, n: 1 }),
    admin.rpc("farm_stat_add", { r: roomId, u: uid, k: `bloom:${flower}`, n: 1 }), // comme la serre : compte pour l'histoire
  ]);
  if (error) return Response.json({ error: "Cueillette impossible pour l'instant." }, { status: 503 });
  return Response.json({ flower, name: ITEMS[flower].name, left: PER_DAY - (data?.count ?? 0) - 1 });
}
