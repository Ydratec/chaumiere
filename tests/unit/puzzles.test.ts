import assert from "node:assert/strict";
import { test } from "node:test";
import { seeded } from "../../src/modules/challenges/orapa-daily.ts";
import { PX, checkPicross, cluesOf, dailyPicross, lineSolve, solveLine } from "../../src/modules/challenges/puzzles/picross.ts";
import { dailyRush, minMoves, replay, reach, moved, solved, type Car } from "../../src/modules/challenges/puzzles/rush.ts";
import { QN, countQueens, dailyQueens, validQueens } from "../../src/modules/challenges/puzzles/queens.ts";
import { bestOf, dailyCompte, reachable } from "../../src/modules/challenges/puzzles/compte.ts";
import { checkHashi, dailyHashi, solveHashi } from "../../src/modules/challenges/puzzles/hashi.ts";

test("picross : indices, déduction d'une ligne, grille du jour sans deviner", () => {
  assert.deepEqual(cluesOf([true, true, false, true, false]), [2, 1]);
  assert.deepEqual(cluesOf([false, false]), [0]);
  assert.deepEqual(solveLine([4], [-1, -1, -1, -1, -1]), [-1, 1, 1, 1, -1]);
  assert.equal(solveLine([3], [-1, 0, -1, 0, -1]), null);
  for (const s of [1, 2, 3]) {
    const d = dailyPicross(seeded(s));
    assert.deepEqual(dailyPicross(seeded(s)).puzzle, d.puzzle, "même graine, même grille");
    assert.deepEqual(lineSolve(d.puzzle), d.solution);
    assert.ok(checkPicross(d.puzzle, d.solution));
    assert.ok(!checkPicross(d.puzzle, d.solution.map((v, i) => (i === 0 ? !v : v))));
    assert.equal(d.solution.length, PX * PX);
  }
});

test("embouteillage : glissements, minimum de coups, vérification d'une solution", () => {
  const cars: Car[] = [{ x: 0, y: 2, len: 2, h: true }, { x: 3, y: 1, len: 3, h: false }];
  assert.deepEqual(reach(cars, 1), [0, 2, 3], "la brouette monte ou descend");
  assert.equal(minMoves(cars), 2);
  assert.equal(replay({ cars }, [{ car: 1, to: 3 }, { car: 0, to: 4 }]), 2);
  assert.equal(replay({ cars }, [{ car: 0, to: 4 }]), null, "bloqué");
  assert.ok(solved(moved(cars, { car: 0, to: 4 })));
  const d = dailyRush(seeded(4));
  assert.ok(d.min >= 6);
}, { timeout: 60_000 });

test("reines : une seule solution, vérification des règles", () => {
  for (const s of [1, 2]) {
    const d = dailyQueens(seeded(s));
    assert.equal(countQueens(d.puzzle), 1);
    assert.ok(validQueens(d.puzzle, d.solution));
    assert.ok(!validQueens(d.puzzle, d.solution.slice(0, QN - 1)));
  }
});

test("le compte est bon : tirage avec solution exacte, meilleur résultat d'un calcul", () => {
  const d = dailyCompte(seeded(2));
  assert.equal(d.plates.length, 6);
  assert.ok(reachable(d.plates).has(d.target));
  const c = { plates: [1, 2, 3, 4, 25, 100], target: 327 };
  // 100 × 3 = 300, puis 300 + 25 = 325 (à 2 près)
  assert.deepEqual(bestOf(c, [{ a: 5, op: "×", b: 2 }, { a: 3, op: "+", b: 4 }]), { value: 325, distance: 2, steps: 2 });
  assert.equal(bestOf(c, [{ a: 0, op: "-", b: 1 }]), null, "résultat négatif interdit");
});

test("hashi : une seule solution, ponts vérifiés (nombres, croisements, tout relié)", () => {
  for (const s of [1, 2, 3]) {
    const d = dailyHashi(seeded(s));
    assert.equal(solveHashi(d.puzzle).length, 1);
    assert.ok(checkHashi(d.puzzle, d.solution));
    assert.ok(!checkHashi(d.puzzle, d.solution.slice(1)));
  }
});
