// Commandes du jour de l'Usine de Noël : 3 par jour et par joueur, payées en pièces de la salle (boosters, questions…).
// C'est le serveur qui fixe le montant et n'accepte chaque commande qu'une fois par jour (heure de Paris) :
// la clé primaire de farm_stats garantit l'unicité. Le jeu tourne dans le navigateur : le plafond (2 100 pièces par jour)
// borne ce qu'on pourrait gagner en trichant.
import { adminDb } from "@/src/lib/db/server";
import { challengeDay } from "@/src/modules/challenges/data";
import { getRoomContext } from "@/src/modules/rooms/context";

export const dynamic = "force-dynamic";
const PAY = [300, 600, 1200]; // petite, moyenne, grosse (même tableau dans public/usine/jeu/game.js, pour l'affichage)

export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const { slot } = (await req.json().catch(() => ({}))) as { slot?: unknown };
  if (slot !== 0 && slot !== 1 && slot !== 2) return Response.json({ error: "Commande inconnue" }, { status: 400 });
  const admin = adminDb(), uid = ctx.user.id;
  const key = `usine:cmd:${challengeDay()}:${slot}`;
  const { error: taken } = await admin.from("farm_stats").insert({ room_id: roomId, user_id: uid, key, count: 1 });
  if (taken) return Response.json({ error: taken.code === "23505" ? "Commande déjà livrée aujourd'hui." : "Livraison impossible pour l'instant." }, { status: taken.code === "23505" ? 409 : 503 });
  const { error } = await admin.rpc("farm_add_items", { r: roomId, u: uid, delta: { coins: PAY[slot] } });
  if (error) { await admin.from("farm_stats").delete().eq("room_id", roomId).eq("user_id", uid).eq("key", key); return Response.json({ error: "Livraison impossible pour l'instant." }, { status: 503 }); }
  return Response.json({ coins: PAY[slot] });
}
