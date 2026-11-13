// Serre de l'usine. POST : récolte d'une serre (`bed` = son numéro, 0 à 9) : le serveur tire 3 fleurs (comme la serre :
// elles peuvent être différentes) et les ajoute à l'inventaire de la salle. Pas de plafond : il suffit de replanter.
// Garde-fou contre la triche (le jeu tourne dans le navigateur) : une même serre ne se récolte qu'une fois par pousse
// (2 h, avec un peu de marge), d'où au plus 10 serres × 12 récoltes par jour.
// GET : les fleurs du joueur (pour la fiche de la serre).
import { adminDb } from "@/src/lib/db/server";
import { ITEMS } from "@/src/modules/farm/catalog";
import { FLOWERS, pickFlower } from "@/src/modules/farm/flowers";
import { getRoomContext } from "@/src/modules/rooms/context";

export const dynamic = "force-dynamic";
const PER_HARVEST = 3, MAX_BEDS = 10, GROW_MIN = 110; // pousse : 2 h dans le jeu, 110 min de marge (horloges)

async function owned(roomId: string, uid: string) {
  const { data } = await adminDb().from("farm_items").select("item, qty").eq("room_id", roomId).eq("user_id", uid).in("item", FLOWERS.map((f) => f.id));
  const q = Object.fromEntries((data ?? []).map((r) => [r.item, r.qty as number]));
  return FLOWERS.map((f) => ({ id: f.id, name: ITEMS[f.id].name, qty: q[f.id] ?? 0 }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) return Response.json({ error: "Non autorisé" }, { status: 401 });
  return Response.json({ flowers: await owned(roomId, ctx.user.id) });
}

export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const { bed } = (await req.json().catch(() => ({}))) as { bed?: unknown };
  if (!Number.isInteger(bed) || (bed as number) < 0 || (bed as number) >= MAX_BEDS) return Response.json({ error: "Serre inconnue" }, { status: 400 });
  const admin = adminDb(), uid = ctx.user.id, key = `usine:serre:${bed}`, now = Math.floor(Date.now() / 60000); // minutes
  const { data: last } = await admin.from("farm_stats").select("count").eq("room_id", roomId).eq("user_id", uid).eq("key", key).maybeSingle();
  if (last && now - last.count < GROW_MIN) return Response.json({ error: "Ces fleurs n'ont pas fini de pousser." }, { status: 429 });
  const picked = Array.from({ length: PER_HARVEST }, () => pickFlower());
  const delta: Record<string, number> = {};
  for (const f of picked) delta[f] = (delta[f] ?? 0) + 1;
  const [{ error }] = await Promise.all([
    admin.rpc("farm_add_items", { r: roomId, u: uid, delta }),
    admin.from("farm_stats").upsert({ room_id: roomId, user_id: uid, key, count: now }, { onConflict: "room_id,user_id,key" }), // heure de la récolte
    ...Object.entries(delta).map(([f, n]) => admin.rpc("farm_stat_add", { r: roomId, u: uid, k: `bloom:${f}`, n })), // comme la serre : compte pour l'histoire
  ]);
  if (error) return Response.json({ error: "Récolte impossible pour l'instant." }, { status: 503 });
  return Response.json({ picked: picked.map((f) => ITEMS[f].name), flowers: await owned(roomId, uid) });
}
