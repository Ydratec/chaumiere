// Partie de l'Usine de Noël du joueur connecté, dans cette salle (le jeu est une page autonome : public/usine/jeu).
// GET : la partie enregistrée (ou null), la sienne ou celle d'un membre (visite) ; PUT : enregistre sa partie.
// Si la table n'existe pas encore (migration 0028 pas appliquée), on répond 503 et le jeu garde sa sauvegarde locale.
// ponytail: le serveur stocke la partie telle que le jeu l'envoie (pas de contrôle de triche) ; à renforcer pour un classement à enjeu.
import { adminDb } from "@/src/lib/db/server";
import { getRoomContext } from "@/src/modules/rooms/context";

export const dynamic = "force-dynamic";
const MAX_BYTES = 2_000_000; // une partie fait quelques dizaines de Ko ; au-delà, c'est anormal

// GET ?list=1 : les membres de la salle (soi compris, `me`), l'étape, les étoiles et les pièces gagnées de leur usine (visites et classement) ; GET ?u=<membre> : l'usine d'un membre (visite).
export async function GET(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  if (q.get("list")) {
    const { data, error } = await adminDb().from("usine_saves").select("user_id, stage:state->stage, stars:state->stars, earned:state->earned").eq("room_id", roomId);
    if (error) return Response.json({ error: "Indisponible" }, { status: 503 });
    const save = new Map((data ?? []).map((r) => [r.user_id, r]));
    return Response.json({ members: ctx.members.map((m) => {
      const r = save.get(m.user_id);
      return { id: m.user_id, name: m.username, me: m.user_id === ctx.user.id, stage: (r?.stage as number) ?? null, stars: Number(r?.stars) || 0, earned: Number(r?.earned) || 0 };
    }) });
  }
  const who = q.get("u") || ctx.user.id;
  if (!ctx.members.some((m) => m.user_id === who)) return Response.json({ error: "Pas dans cette salle" }, { status: 404 });
  const { data, error } = await adminDb().from("usine_saves").select("state, saved_at").eq("room_id", roomId).eq("user_id", who).maybeSingle();
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
  // Garde-fou : on n'écrase jamais une partie par une partie moins avancée (téléphone neuf, réseau lent, vieux cache…).
  // Le jeu reprend alors celle du serveur. 2 min de marge pour les arrondis entre appareils.
  const { data: old } = await adminDb().from("usine_saves").select("time:state->time").eq("room_id", roomId).eq("user_id", ctx.user.id).maybeSingle();
  const time = Number((state as { time?: unknown }).time) || 0;
  if (old && time < (Number(old.time) || 0) - 120) return Response.json({ error: "Partie plus avancée sur le serveur" }, { status: 409 });
  const { error } = await adminDb().from("usine_saves")
    .upsert({ room_id: roomId, user_id: ctx.user.id, state, saved_at: new Date().toISOString() }, { onConflict: "room_id,user_id" });
  if (error) return Response.json({ error: "Indisponible" }, { status: 503 });
  return Response.json({ ok: true });
}
