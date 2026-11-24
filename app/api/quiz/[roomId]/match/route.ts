// Géo Quiz en ligne (page autonome : public/quiz) : parties à plusieurs dans la salle.
// GET : les parties ouvertes de la salle et celles où l'on joue ; GET ?id= : une partie (joueurs, réponses).
// POST { action } : create | join | start | leave | answer | done. Toutes les réponses donnent l'heure du serveur
// (`now`), pour que chaque téléphone cale son horloge et affiche les questions en même temps que les autres.
// Si les tables n'existent pas encore (migration 0034 pas appliquée), on répond 503.
// ponytail: les points sont calculés par le jeu (plafonnés ici) ; comme pour les scores solo, pas de contrôle de triche plus poussé.
import { adminDb } from "@/src/lib/db/server";
import { notify, roomMembers } from "@/src/modules/notifications/push";
import { QUIZ_OPEN, quizVisible } from "@/src/modules/quiz/access";
import { allAnswered, COUNTDOWN_MS, MAX_PLAYERS, readAnswer, readNewMatch, type MatchPlayer, type Rules } from "@/src/modules/quiz/match";
import { QUIZ_GAMES } from "@/src/modules/quiz/scores";
import { getRoomContext } from "@/src/modules/rooms/context";

export const dynamic = "force-dynamic";
const LOBBY_MAX_AGE = 2 * 3600_000; // un salon abandonné disparaît de la liste au bout de 2 h
const PLAY_MAX_AGE = 3 * 3600_000;

type Ctx = NonNullable<Awaited<ReturnType<typeof getRoomContext>>>;
type PlayerRow = { user_id: string; answers: MatchPlayer["answers"]; score: number; left_game: boolean; joined_at: string };

const now = () => Date.now();
const fail = (error: string, status = 400) => Response.json({ error, now: now() }, { status });

async function loadMatch(ctx: Ctx, roomId: string, id: string) {
  const db = adminDb();
  const [{ data: match, error }, { data: players }] = await Promise.all([
    db.from("quiz_matches").select("*").eq("room_id", roomId).eq("id", id).maybeSingle(),
    db.from("quiz_match_players").select("user_id, answers, score, left_game, joined_at").eq("match_id", id).order("joined_at"),
  ]);
  if (error) return { error: "Indisponible", status: 503 } as const;
  if (!match) return { error: "Partie introuvable", status: 404 } as const;
  const list = ((players ?? []) as PlayerRow[]).map((p) => ({ ...p, name: ctx.names[p.user_id] ?? "Ancien membre", me: p.user_id === ctx.user.id }));
  return { match, players: list };
}

export async function GET(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx || !quizVisible(ctx.user)) return fail("Non autorisé", 401);
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const r = await loadMatch(ctx, roomId, id);
    if ("error" in r) return fail(r.error as string, r.status);
    return Response.json({ now: now(), match: r.match, players: r.players });
  }
  const db = adminDb();
  const since = new Date(now() - PLAY_MAX_AGE).toISOString();
  const { data: matches, error } = await db.from("quiz_matches").select("id, host, mode, rules, game, level, cat, status, created_at")
    .eq("room_id", roomId).in("status", ["lobby", "playing"]).gte("created_at", since).order("created_at", { ascending: false });
  if (error) return fail("Indisponible", 503);
  const ids = (matches ?? []).map((m) => m.id);
  const { data: players } = ids.length ? await db.from("quiz_match_players").select("match_id, user_id").in("match_id", ids) : { data: [] };
  const list = (matches ?? []).map((m) => {
    const who = (players ?? []).filter((p) => p.match_id === m.id).map((p) => p.user_id as string);
    return { ...m, hostName: ctx.names[m.host] ?? "?", players: who.map((u) => ctx.names[u] ?? "?"), mine: who.includes(ctx.user.id) };
  }).filter((m) => m.mine || (m.status === "lobby" && Date.parse(m.created_at) > now() - LOBBY_MAX_AGE));
  return Response.json({ now: now(), matches: list });
}

export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx || !quizVisible(ctx.user)) return fail("Non autorisé", 401);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail("Requête illisible"); }
  const db = adminDb(), me = ctx.user.id, id = typeof body.id === "string" ? body.id : "";

  if (body.action === "create") {
    const m = readNewMatch(body);
    if (!m) return fail("Partie illisible");
    const seed = Math.floor(Math.random() * 2 ** 31);
    const { data: match, error } = await db.from("quiz_matches").insert({ room_id: roomId, host: me, ...m, seed }).select("id").single();
    if (error || !match) return fail("Indisponible", 503);
    await db.rpc("quiz_join", { m: match.id, u: me });
    // ponytail: notifications seulement une fois le quiz ouvert à tous (pendant les tests, les autres ne le voient pas)
    if (QUIZ_OPEN) {
      const what = m.mode === "duel" ? "te défie en duel" : m.rules === "elim" ? "lance une partie à élimination" : "lance une partie";
      await notify(await roomMembers(roomId, me), "games", { title: "Géo Quiz", body: `${ctx.names[me]} ${what} : ${QUIZ_GAMES[m.game] ?? "défi sur mesure"}`, url: `/r/${roomId}/quiz?m=${match.id}`, tag: `quiz-${match.id}` }).catch(() => {});
    }
    return Response.json({ now: now(), id: match.id });
  }

  if (!id) return fail("Partie manquante");
  const r = await loadMatch(ctx, roomId, id);
  if ("error" in r) return fail(r.error as string, r.status);
  const { match, players } = r;
  const mine = players.find((p) => p.me);

  switch (body.action) {
    case "join": {
      const { data, error } = await db.rpc("quiz_join", { m: id, u: me });
      if (error) return fail("Indisponible", 503);
      if (data !== "ok") return fail(data === "commencee" ? "La partie a déjà commencé" : data === "complete" ? "La partie est complète" : "Partie introuvable", 409);
      return Response.json({ now: now(), ok: true });
    }
    case "start": {
      if (match.host !== me || match.status !== "lobby") return fail("Seul le créateur lance la partie", 403);
      if (players.length < 2 || players.length > MAX_PLAYERS) return fail("Il faut au moins 2 joueurs", 409);
      const start_at = new Date(now() + COUNTDOWN_MS).toISOString();
      await db.from("quiz_matches").update({ status: "playing", start_at }).eq("id", id).eq("status", "lobby");
      return Response.json({ now: now(), ok: true });
    }
    case "leave": {
      if (!mine) return Response.json({ now: now(), ok: true });
      if (match.status === "lobby") {
        if (match.host === me) await db.from("quiz_matches").update({ status: "cancelled" }).eq("id", id);
        else await db.from("quiz_match_players").delete().eq("match_id", id).eq("user_id", me);
      } else await db.from("quiz_match_players").update({ left_game: true }).eq("match_id", id).eq("user_id", me);
      return Response.json({ now: now(), ok: true });
    }
    case "answer": {
      if (!mine || match.status !== "playing") return fail("Pas dans cette partie", 409);
      const a = readAnswer(body, match.n);
      if (!a) return fail("Réponse illisible");
      const { error } = await db.rpc("quiz_answer", { m: id, u: me, a });
      if (error) return fail("Indisponible", 503);
      // tout le monde en lice a répondu ? la question se termine pour tous (sinon, à la fin du chrono)
      const { data: fresh } = await db.from("quiz_match_players").select("user_id, answers, left_game").eq("match_id", id);
      const list = ((fresh ?? []) as { user_id: string; answers: MatchPlayer["answers"]; left_game: boolean }[]).map((p) => ({ user_id: p.user_id, answers: p.answers, left: p.left_game }));
      if (allAnswered(match.rules as Rules, list, a.i)) await db.rpc("quiz_mark_end", { m: id, i: a.i });
      return Response.json({ now: now(), ok: true });
    }
    case "done": {
      if (mine && match.status === "playing") await db.from("quiz_matches").update({ status: "done" }).eq("id", id).eq("status", "playing");
      return Response.json({ now: now(), ok: true });
    }
  }
  return fail("Action inconnue");
}
