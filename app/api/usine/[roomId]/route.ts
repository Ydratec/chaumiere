// Partie de l'Usine de Noël du joueur connecté, dans cette salle (le jeu est une page autonome : public/usine/jeu).
// GET : la partie enregistrée (ou null) ; PUT : enregistre la partie envoyée.
// Si la table n'existe pas encore (migration 0028 pas appliquée), on répond 503 et le jeu garde sa sauvegarde locale.
// ponytail: le serveur stocke la partie telle que le jeu l'envoie (pas de contrôle de triche) ; à renforcer pour un classement à enjeu.
import { adminDb } from "@/src/lib/db/server";
import { getRoomContext } from "@/src/modules/rooms/context";

export const dynamic = "force-dynamic";
const MAX_BYTES = 2_000_000; // une partie fait quelques dizaines de Ko ; au-delà, c'est anormal

export async function GET(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const { data, error } = await adminDb().from("usine_saves").select("state, saved_at").eq("room_id", roomId).eq("user_id", ctx.user.id).maybeSingle();
  if (error) return Response.json({ error: "Indisponible" }, { status: 503 });
  return Response.json({ state: data?.state ?? null, savedAt: data ? Date.parse(data.saved_at) : null });
}

export async function PUT(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.text();
  if (body.length > MAX_BYTES) return Response.json({ error: "Partie trop grosse" }, { status: 413 });
  let state: unknown;
  try { state = JSON.parse(body); } catch { return Response.json({ error: "Partie illisible" }, { status: 400 }); }
  if (!state || typeof state !== "object" || (state as { v?: unknown }).v !== 2) return Response.json({ error: "Partie illisible" }, { status: 400 });
  const { error } = await adminDb().from("usine_saves")
    .upsert({ room_id: roomId, user_id: ctx.user.id, state, saved_at: new Date().toISOString() }, { onConflict: "room_id,user_id" });
  if (error) return Response.json({ error: "Indisponible" }, { status: 503 });
  return Response.json({ ok: true });
}
