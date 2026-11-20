import assert from "node:assert/strict";
import { test } from "node:test";
import { aliveAt, allAnswered, ranking, readAnswer, readNewMatch, type MatchPlayer } from "../../src/modules/quiz/match.ts";

const p = (user_id: string, goods: (boolean | null)[], left = false): MatchPlayer => ({
  user_id, left, answers: goods.flatMap((g, i) => (g === null ? [] : [{ i, good: g, pts: g ? 10 : 0 }])),
});

test("quiz en ligne : création de partie vérifiée", () => {
  assert.deepEqual(readNewMatch({ mode: "duel", game: "flag", level: "expert", cat: "" }), { mode: "duel", rules: "points", game: "flag", level: "expert", cat: "" });
  assert.equal(readNewMatch({ mode: "duel", rules: "elim", game: "flag", level: "facile" }), null); // pas d'élimination en duel
  assert.equal(readNewMatch({ mode: "party", game: "daily", level: "facile" }), null); // le défi du jour se joue seul
  assert.equal(readNewMatch({ mode: "party", game: "inconnu", level: "facile" }), null);
  assert.equal(readNewMatch({ mode: "party", rules: "elim", game: "world", level: "facile", cat: "ville" })?.rules, "elim");
});

test("quiz en ligne : réponses plafonnées", () => {
  assert.equal(readAnswer({ i: 2, good: true, pts: 18 }, 7)?.pts, 18);
  assert.equal(readAnswer({ i: 7, good: true, pts: 18 }, 7), null); // au-delà de la dernière question
  assert.equal(readAnswer({ i: 1, good: true, pts: 41 }, 7), null);
  assert.deepEqual(readAnswer({ i: 0, good: false, pts: 3, pt: [10, 20] }, 7)?.pt, [10, 20]);
});

test("quiz en ligne : élimination (personne ne sort si tous ratent)", () => {
  const players = [p("A", [true, true, false]), p("B", [true, false, null]), p("C", [false, false, true])];
  assert.deepEqual(aliveAt("elim", players, 0), ["A", "B", "C"]);
  assert.deepEqual(aliveAt("elim", players, 1), ["A", "B"]); // C rate la 1re
  assert.deepEqual(aliveAt("elim", players, 2), ["A"]); // B rate la 2e
  const allWrong = [p("A", [false]), p("B", [false])];
  assert.deepEqual(aliveAt("elim", allWrong, 1), ["A", "B"]);
  assert.deepEqual(aliveAt("points", players, 2), ["A", "B", "C"]);
});

test("quiz en ligne : la question se termine quand tous les joueurs en lice ont répondu", () => {
  const players = [p("A", [true, true]), p("B", [true, null]), p("C", [false, null])];
  assert.equal(allAnswered("points", players, 1), false); // B et C n'ont pas répondu
  assert.equal(allAnswered("elim", players, 1), false); // B est encore en lice
  assert.equal(allAnswered("elim", [p("A", [true, true]), p("C", [false, null])], 1), true); // C est éliminé
  assert.equal(allAnswered("points", [p("A", [true]), p("B", [null], true)], 0), true); // B a quitté
});

test("quiz en ligne : classement final", () => {
  const players = [p("A", [true, true, false]), p("B", [true, false, null]), p("C", [false, false, true])];
  assert.deepEqual(ranking("elim", players, 40).map((r) => [r.user, r.out]), [["A", null], ["B", 1], ["C", 0]]);
  assert.deepEqual(ranking("points", players, 7).map((r) => r.user), ["A", "B", "C"]); // 20, 10, 10 : B arrivé avant C
});
