// Géo Quiz en ligne : règles des parties à plusieurs (duel, partie aux points, partie à élimination).
// Module pur (sans base) : utilisé par l'API (app/api/quiz/[roomId]/match) et testé dans tests/unit/quiz-match.test.ts.
// Le jeu (public/quiz) fabrique les mêmes questions chez tous les joueurs à partir de la graine de la partie,
// et calcule l'horloge commune ; le serveur garde les réponses et note quand tout le monde a répondu.
import { QUIZ_GAMES } from "./scores.ts";

export type Mode = "duel" | "party";
export type Rules = "points" | "elim";
export type Answer = { i: number; good: boolean; pts: number; pick?: string | null; pt?: [number, number] | null };
export type MatchPlayer = { user_id: string; answers: Answer[]; left: boolean };

export const ELIM_QUESTIONS = 40; // plafond de questions d'une partie à élimination
export const MAX_PLAYERS = 12;
export const COUNTDOWN_MS = 4000; // décompte avant la première question

/** Nombre de questions d'une partie aux points : 7 (5 pour l'itinéraire, plus long), comme en solo. */
export const pointsQuestions = (game: string) => (game === "route" ? 5 : 7);

export type NewMatch = { mode: Mode; rules: Rules; game: string; level: "facile" | "expert"; cat: string };

/** Lit et vérifie une demande de création de partie ; null si invalide. */
export function readNewMatch(body: unknown): NewMatch | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const mode = b.mode === "duel" || b.mode === "party" ? b.mode : null;
  const rules = b.rules === "elim" ? "elim" : "points";
  const game = String(b.game ?? ""), level = b.level === "expert" ? "expert" : b.level === "facile" ? "facile" : null;
  const cat = typeof b.cat === "string" && /^[a-z]{0,20}$/.test(b.cat) ? b.cat : "";
  if (!mode || !level || !(game in QUIZ_GAMES) || game === "daily") return null;
  if (mode === "duel" && rules !== "points") return null;
  return { mode, rules, game, level, cat };
}

/** Lit une réponse envoyée par le jeu ; null si invalide. Les points sont plafonnés (20, ×2 à la dernière question). */
export function readAnswer(body: unknown, n: number): Answer | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const i = Number(b.i), pts = Number(b.pts);
  if (!Number.isInteger(i) || i < 0 || i >= n || !Number.isInteger(pts) || pts < 0 || pts > 40) return null;
  const pick = typeof b.pick === "string" ? b.pick.slice(0, 80) : null;
  const pt = Array.isArray(b.pt) && b.pt.length === 2 && b.pt.every((v) => typeof v === "number" && Number.isFinite(v)) ? [b.pt[0], b.pt[1]] as [number, number] : null;
  return { i, good: b.good === true, pts, pick, pt };
}

/**
 * Joueurs encore en lice au moment de la question `i` (avant d'y répondre).
 * Aux points : tous ceux qui n'ont pas quitté. À l'élimination : à chaque question, ceux qui ont raté (ou pas répondu)
 * sortent, sauf si tout le monde a raté (personne ne sort alors).
 */
export function aliveAt(rules: Rules, players: MatchPlayer[], i: number) {
  let alive = players.filter((p) => !p.left).map((p) => p.user_id);
  if (rules !== "elim") return alive;
  for (let j = 0; j < i && alive.length > 1; j++) {
    const ok = alive.filter((u) => players.find((p) => p.user_id === u)?.answers.some((a) => a.i === j && a.good));
    if (ok.length) alive = ok;
  }
  return alive;
}

/** Tous les joueurs en lice ont-ils répondu à la question `i` ? (La question se termine alors pour tout le monde.) */
export function allAnswered(rules: Rules, players: MatchPlayer[], i: number) {
  const alive = aliveAt(rules, players, i);
  return alive.length > 0 && alive.every((u) => players.find((p) => p.user_id === u)?.answers.some((a) => a.i === i));
}

/**
 * Classement final : aux points, par score ; à l'élimination, par question atteinte (le dernier en lice d'abord), puis score.
 * `out` = question à laquelle le joueur a été éliminé (null s'il est allé au bout).
 */
export function ranking(rules: Rules, players: MatchPlayer[], n: number) {
  const score = (p: MatchPlayer) => p.answers.reduce((t, a) => t + a.pts, 0);
  const out = new Map<string, number | null>(players.map((p) => [p.user_id, null]));
  if (rules === "elim") {
    for (let j = 0; j < n; j++) {
      const before = aliveAt(rules, players, j), after = aliveAt(rules, players, j + 1);
      before.filter((u) => !after.includes(u)).forEach((u) => out.set(u, j));
      if (after.length <= 1) break;
    }
  }
  return players
    .map((p) => ({ user: p.user_id, score: score(p), out: out.get(p.user_id) ?? null, left: p.left }))
    .sort((a, b) => (rules === "elim" ? (b.out ?? Infinity) - (a.out ?? Infinity) : 0) || b.score - a.score);
}
