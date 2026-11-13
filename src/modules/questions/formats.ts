// Formats des questions (fonctions pures, testées dans tests/unit/formats.test.ts). Le serveur valide avec validAnswer,
// l'affichage dépouille avec choiceTally / rankTally / duoTally.
//   open   : réponse libre                     vote   : on choisit un membre (soi compris)
//   with   : « avec qui… » : un membre, pas soi choice : « tu préfères » : un des deux choix (content = son numéro)
//   rank   : on classe tout le monde (content = JSON des ids, du premier au dernier)
//   duo    : on choisit deux personnes (content = JSON des deux ids)
// Une question peut viser quelqu'un ({x} dans le texte, remplacé à la création par un membre tiré au hasard : payload.target) :
// la personne visée ne fait alors pas partie des choix.

export type Kind = "open" | "vote" | "with" | "choice" | "rank" | "duo";
export type Ans = { user_id: string; content: string };
type Member = { id: string; name: string };

export const isKind = (k: unknown): k is Kind => typeof k === "string" && ["open", "vote", "with", "choice", "rank", "duo"].includes(k);

/** Les personnes qu'on peut choisir (vote, with, duo, rank). */
export function candidates<M extends Member>(members: M[], kind: Kind, me: string, target?: string | null): M[] {
  return members.filter((m) => m.id !== target && !(kind === "with" && m.id === me));
}

/** Liste d'ids écrite en JSON (classement, duo) ; null si illisible. */
export function parseList(content: string): string[] | null {
  try {
    const v = JSON.parse(content);
    return Array.isArray(v) && v.every((x) => typeof x === "string") ? v : null;
  } catch {
    return null;
  }
}

/** La réponse est-elle valable pour ce format ? `cands` : ids qu'on peut choisir ; `options` : les choix d'un « tu préfères ». */
export function validAnswer(kind: Kind, content: string, cands: string[], options?: string[]): boolean {
  if (kind === "open") return content.length > 0;
  if (kind === "vote" || kind === "with") return cands.includes(content);
  if (kind === "choice") return /^\d+$/.test(content) && Number(content) < (options?.length ?? 0);
  const list = parseList(content);
  if (!list || new Set(list).size !== list.length || !list.every((id) => cands.includes(id))) return false;
  return kind === "duo" ? list.length === 2 : list.length === cands.length; // rank : tout le monde, une fois
}

/** Tu préfères : pour chaque choix, qui l'a pris, et sa part (sur le nombre de réponses). */
export function choiceTally(answers: Ans[], n: number) {
  const valid = answers.filter((a) => /^\d+$/.test(a.content) && Number(a.content) < n);
  const rows = Array.from({ length: n }, (_, i) => {
    const voters = valid.filter((a) => Number(a.content) === i).map((a) => a.user_id);
    return { i, voters, share: valid.length ? voters.length / valid.length : 0 };
  });
  return { total: valid.length, rows };
}

/** Classement : ordre moyen (position moyenne, 1 = premier), du premier au dernier ; et le classement de chacun. */
export function rankTally<M extends Member>(answers: Ans[], cands: M[]) {
  const ids = cands.map((c) => c.id);
  const lists = answers.map((a) => ({ user_id: a.user_id, order: parseList(a.content) })).filter((x): x is { user_id: string; order: string[] } => !!x.order);
  const rows = cands.map((c) => {
    const pos = lists.map((l) => l.order.indexOf(c.id)).filter((p) => p >= 0).map((p) => p + 1);
    return { ...c, avg: pos.length ? pos.reduce((s, p) => s + p, 0) / pos.length : null };
  });
  rows.sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity) || a.name.localeCompare(b.name));
  return { total: lists.length, rows, lists: lists.map((l) => ({ user_id: l.user_id, order: l.order.filter((id) => ids.includes(id)) })) };
}

/** Duos : les paires les plus choisies (dans l'ordre alphabétique des ids, pour qu'A+B = B+A), avec qui les a choisies. */
export function duoTally(answers: Ans[]) {
  const pairs = new Map<string, { pair: [string, string]; voters: string[] }>();
  for (const a of answers) {
    const l = parseList(a.content);
    if (!l || l.length !== 2 || l[0] === l[1]) continue;
    const pair = [...l].sort() as [string, string], key = pair.join("+");
    if (!pairs.has(key)) pairs.set(key, { pair, voters: [] });
    pairs.get(key)!.voters.push(a.user_id);
  }
  const rows = [...pairs.values()].sort((a, b) => b.voters.length - a.voters.length || a.pair.join().localeCompare(b.pair.join()));
  return { total: rows.reduce((n, r) => n + r.voters.length, 0), rows };
}
