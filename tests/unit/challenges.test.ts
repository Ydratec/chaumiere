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

test("défi du jour : demander une case (2 coups), pas deux fois la même", async () => {
  const { sendProbe, PROBE_COST } = await import("../../src/modules/challenges/orapa-daily.ts");
  const g = dailyGrid(3);
  const filled = g.findIndex(Boolean), empty = g.findIndex((c) => !c);
  let a = sendProbe(g, fresh(), filled)!;
  assert.deepEqual(a.log[0], { probe: filled, color: g[filled]!.c });
  a = sendProbe(g, a, empty)!;
  assert.deepEqual(a.log[1], { probe: empty, color: null });
  assert.equal(sendProbe(g, a, empty), null, "déjà demandée");
  assert.equal(sendProbe(g, a, 999), null, "hors de la grille");
  assert.equal(scoreOf(a), 2 * PROBE_COST);
});

import { CODE_MAX, codeReward, playCode, score as codeScore, secretCode, type CodeAttempt } from "../../src/modules/challenges/code-daily.ts";
import { MOT_MAX, answerAt, marksOf, motReward, normalize, playMot, type MotAttempt } from "../../src/modules/challenges/mot-daily.ts";
import { SOLUTIONS, VALIDES } from "../../src/modules/challenges/mots.ts";
import { kindOf, occurrence } from "../../src/modules/challenges/rotation.ts";
import { seeded } from "../../src/modules/challenges/orapa-daily.ts";

test("rotation : Orapa le 30 octobre, puis Code secret, puis Mot du jour ; sans Orapa, les deux autres", () => {
  assert.deepEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"].map((d) => kindOf(d)), ["orapa", "code", "mot", "orapa"]);
  assert.deepEqual(["2026-10-30", "2026-10-31", "2026-11-01"].map((d) => kindOf(d, false)), ["code", "mot", "code"]);
  assert.equal(occurrence("2026-11-01"), 0);
  assert.equal(occurrence("2026-11-04"), 1);
});

test("code secret : bien placés, mal placés (doublons comptés une fois), essais limités, gain", () => {
  assert.deepEqual(codeScore(["rouge", "rouge", "bleu", "vert"], ["rouge", "bleu", "rouge", "jaune"]), { good: 1, near: 2 });
  assert.deepEqual(codeScore(["rouge", "jaune", "jaune", "vert"], ["jaune", "jaune", "jaune", "jaune"]), { good: 2, near: 0 });
  const secret = secretCode(seeded(5));
  assert.deepEqual(secretCode(seeded(5)), secret, "même graine, même code");
  let a: CodeAttempt = { log: [], solved: false };
  assert.equal(playCode(secret, a, ["rouge"]), null, "code incomplet");
  assert.equal(playCode(secret, a, ["rouge", "rouge", "rouge", "noir"]), null, "couleur inconnue");
  const wrong = secret.map((p) => (p === "rouge" ? "bleu" : "rouge"));
  for (let i = 0; i < CODE_MAX; i++) a = playCode(secret, a, wrong)!;
  assert.equal(a.solved, false);
  assert.equal(playCode(secret, a, secret), null, "plus d'essai après 10");
  assert.equal(playCode(secret, { log: [], solved: false }, secret)!.solved, true);
  assert.deepEqual([1, 2, 3, 8, 10].map(codeReward), [200, 180, 155, 30, 30]);
});

test("mot du jour : couleurs (lettres doubles), dictionnaire, accents, 6 essais, gain", () => {
  assert.deepEqual(marksOf("crepe", "pepee"), ["near", "near", "no", "no", "ok"], "un seul p et un seul e restants à signaler");
  assert.deepEqual(marksOf("allee", "elles"), ["near", "ok", "ok", "ok", "no"]);
  assert.deepEqual(marksOf("table", "table"), ["ok", "ok", "ok", "ok", "ok"]);
  assert.equal(normalize("Crêpe"), "crepe");
  const valid = (w: string) => VALIDES.has(w);
  let a: MotAttempt = { log: [], solved: false };
  assert.deepEqual(playMot("table", a, "zzzzz", valid), { error: "Ce mot n'est pas dans le dictionnaire." });
  assert.deepEqual(playMot("table", a, "abc", valid), { error: "Il faut un mot de 5 lettres." });
  const r = playMot("table", a, "Crêpe", valid);
  assert.ok("attempt" in r);
  a = (r as { attempt: MotAttempt }).attempt;
  assert.deepEqual(playMot("table", a, "crepe", valid), { error: "Tu as déjà essayé ce mot." });
  assert.equal((playMot("table", a, "table", valid) as { attempt: MotAttempt }).attempt.solved, true);
  assert.deepEqual([1, 2, 6].map(motReward), [200, 170, 60]);
  assert.equal(MOT_MAX, 6);
});

test("mot du jour : solutions toutes valides, sans doublon, et pas de répétition avant la fin de la liste", () => {
  assert.ok(SOLUTIONS.length >= 300);
  assert.equal(new Set(SOLUTIONS).size, SOLUTIONS.length);
  for (const w of SOLUTIONS) assert.ok(VALIDES.has(w) && /^[a-z]{5}$/.test(w), w);
  const picks = Array.from({ length: SOLUTIONS.length }, (_, n) => answerAt(SOLUTIONS, seeded(9), n));
  assert.equal(new Set(picks).size, SOLUTIONS.length);
});
