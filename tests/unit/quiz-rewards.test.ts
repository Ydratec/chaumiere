import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyReward, onlineReward, soloGoods, soloShare, streakBefore } from "../../src/modules/quiz/rewards.ts";

test("défi du jour : 500 + jusqu'à 300 selon le score + série plafonnée", () => {
  assert.equal(dailyReward(0, 0), 500);
  assert.equal(dailyReward(160, 0), 800);
  assert.equal(dailyReward(80, 0), 650);
  assert.equal(dailyReward(999, 0), 800); // score borné
  assert.equal(dailyReward(160, 2), 900);
  assert.equal(dailyReward(160, 30), 1100); // série plafonnée à +300
});

test("série : jours d'affilée jusqu'à hier", () => {
  assert.equal(streakBefore([], "2026-11-24"), 0);
  assert.equal(streakBefore(["2026-11-23", "2026-11-22", "2026-11-20"], "2026-11-24"), 2);
  assert.equal(streakBefore(["2026-11-22"], "2026-11-24"), 0); // hier manqué
  assert.equal(streakBefore(["2026-02-28", "2026-03-01"], "2026-03-02"), 2); // changement de mois
});

test("parties solo : bonnes réponses bornées, survie = la série", () => {
  assert.equal(soloGoods({ goods: 5 }, "normal", 80), 5);
  assert.equal(soloGoods({ goods: 99 }, "normal", 80), 15);
  assert.equal(soloGoods({}, "normal", 80), 0);
  assert.equal(soloGoods({ goods: 3 }, "survie", 12), 12);
  assert.deepEqual([0, 1, 2, 3, 9].map(soloShare), [1, 0.5, 0.25, 0, 0]);
});

test("en ligne : participation et victoire", () => {
  assert.equal(onlineReward(false), 100);
  assert.equal(onlineReward(true), 250);
});
