// Dépouillement d'une question de vote (fonction pure, testée dans tests/unit/tally.test.ts).

export type Vote = { user_id: string; content: string };

/**
 * Une ligne par membre, triée par nombre de voix (puis par pseudo) : qui a voté pour lui, et la part
 * de la barre (1 = le plus voté). Les votes pour un non-membre sont ignorés.
 */
export function tally(votes: Vote[], members: { id: string; name: string }[]) {
  const ids = new Set(members.map((m) => m.id));
  const valid = votes.filter((v) => ids.has(v.content));
  const rows = members.map((m) => ({ ...m, voters: valid.filter((v) => v.content === m.id).map((v) => v.user_id) }));
  rows.sort((a, b) => b.voters.length - a.voters.length || a.name.localeCompare(b.name));
  const max = Math.max(1, ...rows.map((r) => r.voters.length));
  return { total: valid.length, rows: rows.map((r) => ({ ...r, share: r.voters.length / max })) };
}
