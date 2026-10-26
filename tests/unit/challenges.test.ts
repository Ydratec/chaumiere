import assert from "node:assert/strict";
import { test } from "node:test";
import { EDGES, wave } from "../../src/modules/games/orapa.ts";
import { dailyGrid, rewardOf, scoreOf, sendWave, tryGuess, type DailyAttempt } from "../../src/modules/challenges/orapa-daily.ts";

const fresh = (): DailyAttempt => ({ log: [], misses: 0, solved: false });

test("défi du jour : même graine = même grille, autre graine = autre grille", () => {
  assert.deepEqual(dailyGrid(42), dailyGrid(42));
  assert.notDeepEqual(dailyGrid(42), dailyGrid(43));
  assert.equal(dailyGrid(7).filter(Boolean).length > 0, true);
});

test("défi du jour : ondes (pas deux fois la même), essais, score et gain", () => {
  const g = dailyGrid(1);
  let a = sendWave(g, fresh(), "H1")!;
  assert.deepEqual(a.log[0], { from: "H1", ...wave(g, "H1") });
  assert.equal(sendWave(g, a, "H1"), null, "déjà envoyée");
  assert.equal(sendWave(g, a, "Z9"), null, "repère inconnu");
  a = sendWave(g, a, EDGES[5].id)!;
  const miss = tryGuess(g, a, [])!;
  assert.equal(miss.right, false);
  assert.equal(scoreOf(miss.attempt), 2 + 3);
  const hit = tryGuess(g, miss.attempt, g)!;
  assert.equal(hit.right, true);
  assert.equal(hit.attempt.solved, true);
  assert.equal(sendWave(g, hit.attempt, "B2"), null, "plus d'onde une fois trouvé");
  assert.equal(tryGuess(g, hit.attempt, g), null);
  assert.equal(rewardOf(2), 200);
  assert.equal(rewardOf(10), 120);
  assert.equal(rewardOf(40), 30);
});
