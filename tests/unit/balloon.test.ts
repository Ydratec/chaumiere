import assert from "node:assert/strict";
import { test } from "node:test";
import { activeOn, altitude, around, flight, formatAlt, LANDMARKS, levelFor } from "../../src/modules/questions/balloon.ts";

const members = ["A", "B", "C"];

test("montgolfière : monte quand tous les actifs répondent, redescend d'un cran sinon", () => {
  const days = [
    { day: "2026-10-01", users: ["A", "B"] }, // C pas encore actif : réussi
    { day: "2026-10-02", users: ["A", "B"] }, // réussi
    { day: "2026-10-03", users: ["A"] }, // B manque : raté
    { day: "2026-10-04", users: ["A", "B"] }, // réussi
  ];
  const f = flight(days, members, "2026-10-05");
  assert.deepEqual(f.log.map((l) => l.ok), [true, true, false, true]);
  assert.equal(f.level, 2); // +1 +1 −1 +1
  assert.equal(f.streak, 1);
  assert.equal(f.best, 2);
  assert.deepEqual(f.today.missing, ["A", "B"], "aujourd'hui : en attente, sans pénalité");
});

test("montgolfière : aujourd'hui compte dès que tout le monde a répondu ; un jour sans question est raté", () => {
  const f = flight([{ day: "2026-10-01", users: ["A"] }, { day: "2026-10-03", users: ["A"] }], members, "2026-10-03");
  assert.deepEqual(f.log, [{ day: "2026-10-01", ok: true }, { day: "2026-10-02", ok: false }, { day: "2026-10-03", ok: true }]);
  assert.equal(f.level, 1);
  assert.equal(f.today.done, true);
  assert.equal(f.streak, 1);
});

test("montgolfière : un membre absent depuis 7 jours ne compte plus", () => {
  const byDay = new Map([["2026-10-01", new Set(["A", "B"])], ["2026-10-08", new Set(["A"])]]);
  assert.deepEqual(activeOn(byDay, members, "2026-10-07"), ["A", "B"]);
  assert.deepEqual(activeOn(byDay, members, "2026-10-08"), ["A"], "B n'a rien répondu du 2 au 8");
});

test("altitudes et repères", () => {
  assert.equal(altitude(0), 0);
  assert.ok(altitude(10) > 330 && altitude(10) < 450);
  assert.ok(altitude(56) > 384_400_000, "la Lune en un peu moins de deux mois");
  assert.equal(levelFor(330), 10);
  assert.equal(around(400).passed?.name, "La tour Eiffel");
  assert.equal(around(400).next?.name, "L'Empire State Building");
  assert.ok(LANDMARKS.every((l, i) => !i || l.alt > LANDMARKS[i - 1].alt), "repères dans l'ordre");
  assert.equal(formatAlt(330), "330 m");
  assert.equal(formatAlt(8849), "8,8 km");
});
