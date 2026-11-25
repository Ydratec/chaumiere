// Quiz en ligne (page autonome : public/quiz) : parties à plusieurs dans la salle.
// GET : les parties ouvertes de la salle et celles où l'on joue ; GET ?id= : une partie (joueurs, réponses).
// POST { action } : create | join | start | solo | decline | leave | answer | done | say | rematch. Toutes les réponses donnent l'heure du serveur
// (`now`), pour que chaque téléphone cale son horloge et affiche les questions en même temps que les autres.
// Si les tables n'existent pas encore (migration 0034 pas appliquée), on répond 503.
// Défi à une personne (target) : elle seule est prévenue et peut rejoindre. Le créateur peut l'attendre (duel en direct)
// ou « jouer sans attendre » (solo → async) : chacun joue les mêmes questions à son rythme, la partie se termine
// quand les deux ont fini (done_at), et c'est seulement là que les pièces de la partie sont données aux deux.
// ponytail: les points sont calculés par le jeu (plafonnés ici) ; comme pour les scores solo, pas de contrôle de triche plus poussé.
import { adminDb } from "@/src/lib/db/server";
import { notify, roomMembers } from "@/src/modules/notifications/push";
import { QUIZ_OPEN, quizVisible } from "@/src/modules/quiz/access";
import { allAnswered, COUNTDOWN_MS, MAX_PLAYERS, ranking, readAnswer, readNewMatch, type MatchPlayer, type Rules } from "@/src/modules/quiz/match";
import { onlineReward } from "@/src/modules/quiz/rewards";
import { parisDay, QUIZ_GAMES } from "@/src/modules/quiz/scores";
import { getRoomContext } from "@/src/modules/rooms/context";

export const dynamic = "force-dynamic";
const LOBBY_MAX_AGE = 2 * 3600_000; // un salon abandonné disparaît de la liste au bout de 2 h
const PLAY_MAX_AGE = 3 * 3600_000;
const TARGET_MAX_AGE = 3 * 86_400_000; // un défi à une personne reste ouvert 3 jours

type Ctx = NonNullable<Awaited<ReturnType<typeof getRoomContext>>>;
type PlayerRow = { user_id: string; answers: MatchPlayer["answers"]; score: number; left_game: boolean; joined_at: string; done_at: string | null };

const now = () => Date.now();
const fail = (error: string, status = 400) => Response.json({ error, now: now() }, { status });

async function loadMatch(ctx: Ctx, roomId: string, id: string) {
  const db = adminDb();
  const [{ data: match, error }, { data: players }] = await Promise.all([
    db.from("quiz_matches").select("*").eq("room_id", roomId).eq("id", id).maybeSingle(),
    db.from("quiz_match_players").select("user_id, answers, score, left_game, joined_at, done_at").eq("match_id", id).order("joined_at"),
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
  const since = new Date(now() - TARGET_MAX_AGE).toISOString();
  const { data: matches, error } = await db.from("quiz_matches").select("id, host, mode, rules, game, level, cat, status, created_at, target, async")
    .eq("room_id", roomId).in("status", ["lobby", "playing"]).gte("created_at", since).order("created_at", { ascending: false });
  if (error) return fail("Indisponible", 503);
  const ids = (matches ?? []).map((m) => m.id);
  const { data: players } = ids.length ? await db.from("quiz_match_players").select("match_id, user_id, done_at").in("match_id", ids) : { data: [] };
  const me = ctx.user.id;
  const list = (matches ?? []).map((m) => {
    const rows = (players ?? []).filter((p) => p.match_id === m.id), who = rows.map((p) => p.user_id as string);
    const mineRow = rows.find((p) => p.user_id === me);
    return {
      ...m, hostName: ctx.names[m.host] ?? "?", players: who.map((u) => ctx.names[u] ?? "?"), mine: who.includes(me),
      targetName: m.target ? ctx.names[m.target] ?? "?" : null,
      iDone: !!mineRow?.done_at, // mode chacun son tour : j'ai déjà joué ma partie
      forMe: m.target === me && !mineRow?.done_at, // un défi qui m'est adressé et que je n'ai pas encore joué
    };
  }).filter((m) => {
    const age = now() - Date.parse(m.created_at);
    if (m.target) return (m.host === me || m.target === me) && age < TARGET_MAX_AGE;
    return (m.mine && age < PLAY_MAX_AGE) || (m.status === "lobby" && age < LOBBY_MAX_AGE);
  });
  const members = ctx.members.filter((x) => x.user_id !== me).map((x) => ({ id: x.user_id, name: x.username }));
  return Response.json({ now: now(), matches: list, members });
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
    // défi à une personne : un duel, contre un autre membre de la salle
    const target = typeof body.target === "string" && body.target ? body.target : null;
    if (target && (m.mode !== "duel" || target === me || !ctx.members.some((x) => x.user_id === target))) return fail("Adversaire inconnu");
    const seed = Math.floor(Math.random() * 2 ** 31);
    const { data: match, error } = await db.from("quiz_matches").insert({ room_id: roomId, host: me, ...m, seed, target }).select("id").single();
    if (error || !match) return fail("Indisponible", 503);
    await db.rpc("quiz_join", { m: match.id, u: me });
    // ponytail: notifications seulement une fois le quiz ouvert à tous (pendant les tests, les autres ne le voient pas)
    if (QUIZ_OPEN) {
      const what = target ? "te défie en duel" : m.mode === "duel" ? "lance un duel" : m.rules === "elim" ? "lance une partie à élimination" : "lance une partie";
      const to = target ? [target] : await roomMembers(roomId, me);
      await notify(to, "games", { title: "Quiz", body: `${ctx.names[me]} ${what} : ${QUIZ_GAMES[m.game] ?? "défi sur mesure"}`, url: `/r/${roomId}/quiz?m=${match.id}`, tag: `quiz-${match.id}` }).catch(() => {});
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
      if (data !== "ok") return fail(data === "commencee" ? "La partie a déjà commencé" : data === "complete" ? "La partie est complète" : data === "privee" ? "Ce défi est pour quelqu'un d'autre" : "Partie introuvable", 409);
      return Response.json({ now: now(), ok: true });
    }
    case "start": {
      if (match.host !== me || match.status !== "lobby") return fail("Seul le créateur lance la partie", 403);
      if (players.length < 2 || players.length > MAX_PLAYERS) return fail("Il faut au moins 2 joueurs", 409);
      const start_at = new Date(now() + COUNTDOWN_MS).toISOString();
      await db.from("quiz_matches").update({ status: "playing", start_at }).eq("id", id).eq("status", "lobby");
      return Response.json({ now: now(), ok: true });
    }
    case "say": {
      // tchat du salon : les joueurs de la partie (et la personne défiée, avant même de rejoindre)
      const t = typeof body.t === "string" ? body.t.replace(/\s+/g, " ").trim().slice(0, 200) : "";
      if (!t || (!mine && match.target !== me)) return fail("Impossible ici", 409);
      const { error } = await db.rpc("quiz_say", { m: id, u: me, t });
      if (error) return fail("Indisponible", 503);
      return Response.json({ now: now(), ok: true });
    }
    case "rematch": {
      // revanche : la nouvelle partie se crée quand tous les joueurs encore là l'ont demandée
      if (!mine) return fail("Pas dans cette partie", 409);
      const first = !(match.rematch ?? []).length;
      const { data: next, error } = await db.rpc("quiz_rematch", { m: id, u: me });
      if (error) return fail("Indisponible", 503);
      const others = players.filter((p) => !p.me && !p.left_game).map((p) => p.user_id);
      if (QUIZ_OPEN && others.length) {
        if (next) await notify(others, "games", { title: "Quiz", body: "Revanche ! La partie commence", url: `/r/${roomId}/quiz?m=${next}`, tag: `quiz-${next}` }).catch(() => {});
        else if (first) await notify(others, "games", { title: "Quiz", body: `${ctx.names[me]} veut sa revanche`, url: `/r/${roomId}/quiz?m=${id}`, tag: `quiz-${id}` }).catch(() => {});
      }
      return Response.json({ now: now(), ok: true, next: next ?? null });
    }
    case "solo": {
      // jouer sans attendre la personne défiée : elle jouera les mêmes questions plus tard
      if (match.host !== me || match.status !== "lobby" || !match.target || match.mode !== "duel") return fail("Impossible ici", 409);
      await db.from("quiz_matches").update({ status: "playing", async: true }).eq("id", id).eq("status", "lobby");
      return Response.json({ now: now(), ok: true });
    }
    case "decline": {
      if (match.target !== me || (mine && mine.done_at) || match.status === "done" || match.status === "cancelled") return fail("Impossible ici", 409);
      await db.from("quiz_matches").update({ status: "cancelled" }).eq("id", id);
      if (QUIZ_OPEN) await notify([match.host], "games", { title: "Quiz", body: `${ctx.names[me]} a refusé ton défi`, url: `/r/${roomId}/quiz`, tag: `quiz-${id}` }).catch(() => {});
      return Response.json({ now: now(), ok: true });
    }
    case "leave": {
      if (!mine) return Response.json({ now: now(), ok: true });
      if (match.status === "lobby") {
        if (match.host === me) await db.from("quiz_matches").update({ status: "cancelled" }).eq("id", id);
        else await db.from("quiz_match_players").delete().eq("match_id", id).eq("user_id", me);
      } else if (match.async) {
        // chacun son tour : quitter = finir sa partie avec les réponses déjà données
        if (!mine.done_at) await db.from("quiz_match_players").update({ left_game: true, done_at: new Date().toISOString() }).eq("match_id", id).eq("user_id", me);
        await settleAsync(ctx, roomId, id, me);
      } else await db.from("quiz_match_players").update({ left_game: true }).eq("match_id", id).eq("user_id", me);
      return Response.json({ now: now(), ok: true });
    }
    case "answer": {
      if (!mine || match.status !== "playing" || mine.done_at) return fail("Pas dans cette partie", 409);
      const a = readAnswer(body, match.n);
      if (!a) return fail("Réponse illisible");
      const { error } = await db.rpc("quiz_answer", { m: id, u: me, a });
      if (error) return fail("Indisponible", 503);
      if (match.async) return Response.json({ now: now(), ok: true }); // chacun son rythme : pas d'horloge commune
      // tout le monde en lice a répondu ? la question se termine pour tous (sinon, à la fin du chrono)
      const { data: fresh } = await db.from("quiz_match_players").select("user_id, answers, left_game").eq("match_id", id);
      const list = ((fresh ?? []) as { user_id: string; answers: MatchPlayer["answers"]; left_game: boolean }[]).map((p) => ({ user_id: p.user_id, answers: p.answers, left: p.left_game }));
      if (allAnswered(match.rules as Rules, list, a.i)) await db.rpc("quiz_mark_end", { m: id, i: a.i });
      return Response.json({ now: now(), ok: true });
    }
    case "done": {
      if (match.async) {
        if (mine && !mine.done_at) await db.from("quiz_match_players").update({ done_at: new Date().toISOString() }).eq("match_id", id).eq("user_id", me);
        const r = await settleAsync(ctx, roomId, id, me);
        return Response.json({ now: now(), ok: true, coins: r.coins, pending: !r.over });
      }
      if (mine && match.status === "playing") await db.from("quiz_matches").update({ status: "done" }).eq("id", id).eq("status", "playing");
      // pièces : 100 pour la partie, 150 de plus pour la victoire (une fois par partie, limites dans quiz_grant)
      let coins = 0;
      if (mine && !mine.left_game && mine.answers.length && players.length >= 2) {
        const list = players.map((p) => ({ user_id: p.user_id, answers: p.answers, left: p.left_game }));
        const rank = ranking(match.rules as Rules, list, match.n), top = rank[0];
        const won = match.rules === "elim" ? top?.user === me : (top?.score ?? 0) > 0 && rank.find((x) => x.user === me)?.score === top?.score;
        const opp = players.length === 2 ? players.find((p) => p.user_id !== me)?.user_id ?? null : null;
        const { data } = await db.rpc("quiz_grant", { r: roomId, u: me, d: parisDay(), k: "online", g: match.game, base: onlineReward(won), m: id, opp });
        coins = typeof data === "number" ? data : 0;
      }
      return Response.json({ now: now(), ok: true, coins });
    }
  }
  return fail("Action inconnue");
}

/**
 * Mode chacun son tour : quand les deux joueurs ont fini, la partie se termine, chacun reçoit ses pièces
 * (partie + victoire) et l'autre est prévenu du résultat ; sinon, la personne défiée est prévenue que c'est à elle.
 */
async function settleAsync(ctx: Ctx, roomId: string, id: string, me?: string) {
  const db = adminDb();
  const r = await loadMatch(ctx, roomId, id);
  if ("error" in r) return { over: false, coins: 0 };
  const { match, players } = r;
  const over = !!match.target && players.length === 2 && players.every((p) => p.done_at);
  if (!over) {
    // le créateur a fini : la personne défiée est prévenue (une fois : la notification remplace la précédente)
    const host = players.find((p) => p.user_id === match.host);
    if (me && me === match.host && host?.done_at && match.target && !players.some((p) => p.user_id === match.target) && QUIZ_OPEN) {
      await notify([match.target], "games", { title: "Quiz", body: `${ctx.names[me]} a fait ${host.score} pts : à toi de jouer`, url: `/r/${roomId}/quiz?m=${id}`, tag: `quiz-${id}` }).catch(() => {});
    }
    return { over: false, coins: 0 };
  }
  const { data: closed } = await db.from("quiz_matches").update({ status: "done" }).eq("id", id).eq("status", "playing").select("id");
  if (!closed?.length) return { over: true, coins: 0 }; // déjà réglée par l'autre joueur
  const list = players.map((p) => ({ user_id: p.user_id, answers: p.answers, left: p.left_game }));
  const rank = ranking(match.rules as Rules, list, match.n), top = rank[0];
  let mineCoins = 0;
  for (const p of players) {
    if (!p.answers.length) continue;
    const won = (top?.score ?? 0) > 0 && rank.find((x) => x.user === p.user_id)?.score === top?.score;
    const opp = players.find((x) => x.user_id !== p.user_id)?.user_id ?? null;
    const { data } = await db.rpc("quiz_grant", { r: roomId, u: p.user_id, d: parisDay(), k: "online", g: match.game, base: onlineReward(won), m: id, opp });
    if (p.user_id === me) mineCoins = typeof data === "number" ? data : 0;
  }
  const other = players.find((p) => p.user_id !== me);
  if (me && other && QUIZ_OPEN) {
    const a = players.find((p) => p.user_id === me)!;
    await notify([other.user_id], "games", { title: "Quiz", body: `${ctx.names[me]} a relevé le défi : ${other.score} – ${a.score}`, url: `/r/${roomId}/quiz?m=${id}`, tag: `quiz-${id}` }).catch(() => {});
  }
  return { over: true, coins: mineCoins };
}
