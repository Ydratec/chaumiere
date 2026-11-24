// Quiz (page autonome : public/quiz) : scores des joueurs de la salle.
// POST : enregistre le score d'une partie terminée (pas les duels, joués à deux sur un même téléphone).
// GET ?day=1 : le défi du jour de la salle (première partie de chacun aujourd'hui), pour l'écran de fin du jeu.
// GET ?wallet=1 : mon solde de pièces et mes gains du jour (pour afficher ce que rapporte encore chaque jeu).
// Chaque score enregistré rapporte des pièces (src/modules/quiz/rewards.ts et la fonction SQL quiz_grant, migration 0035).
// Si la table n'existe pas encore (migration 0033 pas appliquée), on répond 503 et le jeu continue avec ses records locaux.
// ponytail: le score est calculé par le jeu (pas de contrôle de triche au-delà des plafonds) ; à renforcer si l'enjeu grandit.
import { adminDb } from "@/src/lib/db/server";
import { quizVisible } from "@/src/modules/quiz/access";
import { parisDay, readScore, dailyFirst, type ScoreRow } from "@/src/modules/quiz/scores";
import { dailyReward, REWARDS, soloGoods, streakBefore } from "@/src/modules/quiz/rewards";
import { getRoomContext } from "@/src/modules/rooms/context";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx || !quizVisible(ctx.user)) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  if (q.get("wallet")) return wallet(roomId, ctx.user.id);
  if (!q.get("day")) return Response.json({ error: "Requête inconnue" }, { status: 400 });
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
  const db = adminDb(), me = ctx.user.id, day = parisDay();
  const { error } = await db.from("quiz_scores").insert({ room_id: roomId, user_id: me, ...s, day });
  if (error) return Response.json({ error: "Indisponible" }, { status: 503 });
  // pièces : le défi du jour une fois par jour (avec la série), les autres parties selon les bonnes réponses
  let base: number;
  if (s.game === "daily") {
    const { data } = await db.from("quiz_rewards").select("day").eq("room_id", roomId).eq("user_id", me).eq("kind", "daily").lt("day", day).order("day", { ascending: false }).limit(40);
    base = dailyReward(s.score, streakBefore(((data ?? []) as { day: string }[]).map((r) => r.day), day));
  } else base = REWARDS.perGood * soloGoods(body, s.format, s.score);
  const { data: coins } = await db.rpc("quiz_grant", { r: roomId, u: me, d: day, k: s.game === "daily" ? "daily" : "solo", g: s.game, base });
  return Response.json({ ok: true, coins: typeof coins === "number" ? coins : 0 });
}

/** Solde et gains du jour : de quoi afficher « rapporte encore 50 % » ou « défi du jour déjà payé ». */
async function wallet(roomId: string, me: string) {
  const db = adminDb(), day = parisDay();
  const [{ data: item }, { data: rows }] = await Promise.all([
    db.from("farm_items").select("qty").eq("room_id", roomId).eq("user_id", me).eq("item", "coins").maybeSingle(),
    db.from("quiz_rewards").select("kind, game, amount").eq("room_id", roomId).eq("user_id", me).eq("day", day),
  ]);
  const list = (rows ?? []) as { kind: string; game: string; amount: number }[];
  const plays: Record<string, number> = {};
  for (const r of list) if (r.kind === "solo") plays[r.game] = (plays[r.game] ?? 0) + 1;
  return Response.json({
    coins: (item as { qty: number } | null)?.qty ?? 0,
    daily: list.some((r) => r.kind === "daily"),
    earned: list.filter((r) => r.kind !== "daily").reduce((t, r) => t + r.amount, 0),
    cap: REWARDS.dayCap,
    plays,
    online: list.filter((r) => r.kind === "online").length,
  });
}
