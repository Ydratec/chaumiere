// Géo Quiz : règles des scores envoyés par le jeu (public/quiz) et calcul des classements de la salle.

/** Jeux du quiz (identifiants du jeu public/quiz/index.html) et leur nom affiché. `daily` = défi du jour. */
export const QUIZ_GAMES: Record<string, string> = {
  daily: "Défi du jour",
  geo: "Frontières", flag: "Drapeaux", cap: "Capitales", reveal: "Frontières · mystère", scale: "Frontières · à l’échelle",
  neighbor: "Voisins", cmp: "Plus grand ?", route: "Itinéraire",
  place: "Placer en France", world: "Placer dans le monde", touch: "Toucher le pays",
  culture: "Monnaies et co",
  hplace: "Placer l’histoire", hdate: "Dates", chrono: "Chronologie",
};

export type QuizScore = { game: string; level: "facile" | "expert"; format: "normal" | "survie"; cat: string; score: number };

/** Lit et vérifie un score envoyé par le jeu ; null s'il est invalide. */
export function readScore(body: unknown): QuizScore | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const game = String(b.game ?? ""), level = String(b.level ?? ""), format = String(b.format ?? "");
  const cat = typeof b.cat === "string" ? b.cat.slice(0, 20) : "";
  const score = Number(b.score);
  if (!(game in QUIZ_GAMES) || (level !== "facile" && level !== "expert") || (format !== "normal" && format !== "survie")) return null;
  if (game === "daily" && format !== "normal") return null;
  // plafonds : 7 questions à 20 pts, la dernière ×2 = 160 ; en survie, une série (garde-fou large)
  const max = format === "survie" ? 999 : 160;
  if (!Number.isInteger(score) || score < 0 || score > max) return null;
  return { game, level, format, cat: /^[a-z]*$/.test(cat) ? cat : "", score };
}

/** Date du jour à Paris (AAAA-MM-JJ), la même pour toute la salle. */
export const parisDay = (at = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(at);

export type ScoreRow = { user_id: string; game: string; level: string; format: string; cat: string; score: number; day: string; created_at: string };

/** Défi du jour : seule la première partie de chacun compte (on peut rejouer pour s'entraîner). Trié du meilleur au moins bon. */
export function dailyFirst(rows: ScoreRow[], day: string) {
  const first = new Map<string, ScoreRow>();
  for (const r of rows.filter((r) => r.game === "daily" && r.day === day).sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!first.has(r.user_id)) first.set(r.user_id, r);
  }
  return [...first.values()].sort((a, b) => b.score - a.score);
}

/** Jours de défi gagnés par chacun (premier score du jour le plus haut, égalités comprises) et défis joués. */
export function dailyWins(rows: ScoreRow[]) {
  const days = [...new Set(rows.filter((r) => r.game === "daily").map((r) => r.day))];
  const out = new Map<string, { user: string; wins: number; played: number }>();
  const get = (u: string) => out.get(u) ?? out.set(u, { user: u, wins: 0, played: 0 }).get(u)!;
  for (const d of days) {
    const list = dailyFirst(rows, d);
    list.forEach((r) => { get(r.user_id).played++; });
    if (list.length) list.filter((r) => r.score === list[0].score).forEach((r) => { get(r.user_id).wins++; });
  }
  return [...out.values()].sort((a, b) => b.wins - a.wins || b.played - a.played);
}

/** Records : meilleur score par jeu, niveau et format (toutes catégories confondues), avec qui le détient. */
export function records(rows: ScoreRow[]) {
  const best = new Map<string, ScoreRow>();
  for (const r of rows) {
    if (r.game === "daily") continue;
    const k = `${r.game}|${r.format}|${r.level}`, cur = best.get(k);
    if (!cur || r.score > cur.score || (r.score === cur.score && r.created_at < cur.created_at)) best.set(k, r);
  }
  return best;
}
