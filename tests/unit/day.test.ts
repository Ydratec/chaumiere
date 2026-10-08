// Lancer : node --test 'tests/unit/*.test.ts'
import assert from "node:assert/strict";
import test from "node:test";
import { notifyHour, paris, questionDay } from "../../src/modules/questions/day.ts";

test("jour de la question selon l'heure de changement (heure de Paris)", () => {
  const at = new Date("2026-10-08T15:30:00Z"); // 17 h 30 à Paris (heure d'été)
  assert.deepEqual(paris(at), { date: "2026-10-08", hour: 17 });
  assert.equal(questionDay(0, at), "2026-10-08"); // change à minuit : aujourd'hui
  assert.equal(questionDay(18, at), "2026-10-07"); // change à 18 h : encore la question d'hier
  assert.equal(questionDay(17, at), "2026-10-08"); // change à 17 h : celle d'aujourd'hui
  assert.equal(questionDay(9, new Date("2026-01-15T07:30:00Z")), "2026-01-14"); // 8 h 30 en hiver, avant 9 h
});

test("heure de notification : pas la nuit", () => {
  assert.equal(notifyHour(18), 18);
  assert.equal(notifyHour(0), 9);
  assert.equal(notifyHour(23), 9);
  assert.equal(notifyHour(8), 8);
});
