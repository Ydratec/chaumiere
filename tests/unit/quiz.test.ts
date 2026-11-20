import assert from "node:assert/strict";
import { test } from "node:test";
import { dailyFirst, dailyWins, parisDay, readScore, records, type ScoreRow } from "../../src/modules/quiz/scores.ts";

const row = (user_id: string, game: string, score: number, day: string, at: string, level = "facile", format = "normal"): ScoreRow =>
  ({ user_id, game, level, format, cat: "", score, day, created_at: at });

test("quiz : un score n'est accepté que s'il est plausible", () => {
  assert.deepEqual(readScore({ game: "geo", level: "facile", format: "normal", cat: "", score: 120 }), { game: "geo", level: "facile", format: "normal", cat: "", score: 120 });
  assert.equal(readScore({ game: "geo", level: "facile", format: "normal", score: 161 }), null); // au-delà de 160
  assert.equal(readScore({ game: "inconnu", level: "facile", format: "normal", score: 10 }), null);
  assert.equal(readScore({ game: "geo", level: "dur", format: "normal", score: 10 }), null);
  assert.equal(readScore({ game: "daily", level: "facile", format: "survie", score: 10 }), null); // le défi se joue en normal
  assert.equal(readScore({ game: "geo", level: "facile", format: "normal", score: 12.5 }), null);
  assert.equal(readScore({ game: "cap", level: "expert", format: "survie", score: 42 })?.score, 42);
  assert.equal(readScore({ game: "world", level: "facile", format: "normal", cat: "<script>", score: 3 })?.cat, ""); // catégorie inattendue ignorée
});

test("quiz : défi du jour, seule la première partie de chacun compte", () => {
  const rows = [
    row("A", "daily", 90, "2026-11-20", "2026-11-20T08:00:00Z"),
    row("A", "daily", 150, "2026-11-20", "2026-11-20T09:00:00Z"), // rejouée : ne compte pas
    row("B", "daily", 110, "2026-11-20", "2026-11-20T10:00:00Z"),
    row("C", "daily", 140, "2026-11-19", "2026-11-19T10:00:00Z"), // autre jour
    row("C", "geo", 160, "2026-11-20", "2026-11-20T10:00:00Z"), // autre jeu
  ];
  assert.deepEqual(dailyFirst(rows, "2026-11-20").map((r) => [r.user_id, r.score]), [["B", 110], ["A", 90]]);
});

test("quiz : jours gagnés (égalités comprises) et records", () => {
  const rows = [
    row("A", "daily", 100, "2026-11-19", "2026-11-19T08:00:00Z"),
    row("B", "daily", 100, "2026-11-19", "2026-11-19T09:00:00Z"),
    row("A", "daily", 50, "2026-11-20", "2026-11-20T08:00:00Z"),
    row("B", "daily", 80, "2026-11-20", "2026-11-20T09:00:00Z"),
    row("A", "geo", 120, "2026-11-20", "2026-11-20T08:00:00Z"),
    row("B", "geo", 120, "2026-11-20", "2026-11-20T09:00:00Z"), // égalité : le premier garde le record
    row("B", "geo", 30, "2026-11-20", "2026-11-20T09:00:00Z", "expert"),
  ];
  assert.deepEqual(dailyWins(rows).map((r) => [r.user, r.wins, r.played]), [["B", 2, 2], ["A", 1, 2]]);
  const best = records(rows);
  assert.equal(best.get("geo|normal|facile")?.user_id, "A");
  assert.equal(best.get("geo|normal|expert")?.score, 30);
  assert.equal(best.has("daily|normal|facile"), false);
});

test("quiz : jour de Paris", () => {
  assert.equal(parisDay(new Date("2026-11-20T23:30:00Z")), "2026-11-21"); // déjà le 21 à Paris
  assert.equal(parisDay(new Date("2026-11-20T22:30:00Z")), "2026-11-20");
});
