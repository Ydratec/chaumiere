import assert from "node:assert/strict";
import { test } from "node:test";
import { dailyStandings, standings } from "../../src/modules/games/standings.ts";

test("classement d'un jeu : 3 points la victoire, 1 l'égalité, seulement ce jeu", () => {
  const g = (type: string, a: string, b: string, w: string) => ({ type, creator: a, opponent: b, winner: w });
  const rows = standings([g("dames", "A", "B", "A"), g("dames", "A", "C", "draw"), g("dames", "B", "C", "C"), g("memory", "A", "B", "B"), { type: "dames", creator: "A", opponent: null, winner: null }], "dames");
  assert.deepEqual(rows.map((r) => [r.user, r.points, r.wins, r.draws, r.losses]), [["A", 4, 1, 1, 0], ["C", 4, 1, 1, 0], ["B", 0, 0, 0, 2]]);
  assert.equal(rows[0].rate, 0.5);
});

test("classement du défi du jour : jours remportés, égalités, moyenne", () => {
  const r = (user_id: string, day: string, score: number | null) => ({ user_id, day, score, solved_at: score === null ? null : "x" });
  const rows = dailyStandings([r("A", "d1", 8), r("B", "d1", 8), r("A", "d2", 12), r("B", "d2", 9), r("C", "d2", null)]);
  assert.deepEqual(rows.map((x) => [x.user, x.days, x.solved, x.avg, x.best]), [["B", 2, 2, 8.5, 8], ["A", 1, 2, 10, 8]]);
});
