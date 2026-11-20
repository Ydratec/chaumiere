// Géo Quiz (page autonome : public/quiz) : scores des joueurs de la salle.
// POST : enregistre le score d'une partie terminée (pas les duels, joués à deux sur un même téléphone).
// GET ?day=1 : le défi du jour de la salle (première partie de chacun aujourd'hui), pour l'écran de fin du jeu.
// Si la table n'existe pas encore (migration 0033 pas appliquée), on répond 503 et le jeu continue avec ses records locaux.
// ponytail: le score est calculé par le jeu (pas de contrôle de triche au-delà des plafonds) ; à renforcer si l'enjeu grandit.
import { adminDb } from "@/src/lib/db/server";
import { quizVisible } from "@/src/modules/quiz/access";
import { parisDay, readScore, dailyFirst, type ScoreRow } from "@/src/modules/quiz/scores";
import { getRoomContext } from "@/src/modules/rooms/context";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx || !quizVisible(ctx.user)) return Response.json({ error: "Non autorisé" }, { status: 401 });
  if (!new URL(req.url).searchParams.get("day")) return Response.json({ error: "Requête inconnue" }, { status: 400 });
  const day = parisDay();
  const { data, error } = await adminDb().from("quiz_scores").select("user_id, game, level, format, cat, score, day, created_at")
    .eq("room_id", roomId).eq("game", "daily").eq("day", day);
  if (error) return Response.json({ error: "Indisponible" }, { status: 503 });
  return Response.json({
    day,
    rows: dailyFirst((data ?? []) as ScoreRow[], day).map((r) => ({ name: ctx.names[r.user_id] ?? "Ancien membre", score: r.score, me: r.user_id === ctx.user.id })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx || !quizVisible(ctx.user)) return Response.json({ error: "Non autorisé" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Score illisible" }, { status: 400 }); }
  const s = readScore(body);
  if (!s) return Response.json({ error: "Score illisible" }, { status: 400 });
  const { error } = await adminDb().from("quiz_scores").insert({ room_id: roomId, user_id: ctx.user.id, ...s, day: parisDay() });
  if (error) return Response.json({ error: "Indisponible" }, { status: 503 });
  return Response.json({ ok: true });
}
