import assert from "node:assert/strict";
import { test } from "node:test";
import { drawTicket, evaluate, isKind, jackpot, PRIZES, returnRate, TICKETS, valueOf, winningCells, winRate, type Kind, type Layout } from "../../src/modules/scratch/tickets.ts";

const KINDS = Object.keys(TICKETS) as Kind[];

test("tickets : les lots existent, les chances sont raisonnables, le retour est un peu inférieur à la mise", () => {
  for (const k of KINDS) {
    assert.ok(TICKETS[k].odds.every(([id]) => id in PRIZES), k);
    const rr = returnRate(k), wr = winRate(k);
    assert.ok(rr >= 0.8 && rr <= 0.92, `${k} : retour ${rr}`);
    assert.ok(wr > 0.4 && wr < 0.55, `${k} : ${wr} de tickets gagnants`);
    // le gros lot est le plus gros et le plus rare
    const rare = Math.min(...TICKETS[k].odds.map(([, p]) => p));
    assert.equal(TICKETS[k].odds.at(-1)![1], rare, `${k} : le gros lot n'est pas le plus rare`);
    assert.ok(TICKETS[k].odds.every(([id]) => valueOf(id) <= valueOf(jackpot(k))), k);
  }
  assert.ok(isKind("small") && !isKind("huge"));
  assert.equal(valueOf("c250"), 250);
  assert.equal(valueOf("moon"), 150);
});

test("règles : la disposition donne exactement le lot tiré (ni plus, ni moins), pour chaque règle", () => {
  let seed = 42;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const rules = { same: 0, line: 0, number: 0 };
  for (const k of KINDS) {
    for (let i = 0; i < 4000; i++) {
      const { layout, prize } = drawTicket(k, rand);
      rules[layout.rule]++;
      assert.equal(evaluate(layout), prize, `${k}/${layout.rule}`);
      if (layout.rule === "number") {
        assert.equal(layout.entries.length, 6);
        assert.equal(new Set(layout.entries.map((e) => e.n)).size, 6, "numéros tous différents");
        assert.ok(layout.win >= 1 && layout.win <= 30);
      } else {
        assert.equal(layout.cells.length, 9);
      }
      assert.equal(winningCells(layout).length > 0, prize !== null);
    }
  }
  const n = KINDS.length * 4000;
  for (const r of Object.values(rules)) assert.ok(Math.abs(r / n - 1 / 3) < 0.03, "les trois règles sortent à peu près aussi souvent");
});

test("règles : trois alignés ≠ trois identiques en désordre, numéro voisin = perdu", () => {
  const l = (rule: "same" | "line", cells: string[]): Layout => ({ rule, cells });
  const desordre = ["c25", "c50", "c25", "c100", "c25", "c200", "c500", "c50", "c100"];
  assert.equal(evaluate(l("same", desordre)), "c25");
  assert.equal(evaluate(l("line", desordre)), null); // 0, 2, 4 ne sont pas alignés
  const diag = ["c25", "c50", "c100", "c200", "c25", "c500", "c50", "c100", "c25"];
  assert.equal(evaluate(l("line", diag)), "c25"); // diagonale 0-4-8
  assert.deepEqual(winningCells(l("line", diag)), [0, 4, 8]);
  const num: Layout = { rule: "number", win: 12, entries: [{ n: 11, p: "c5000" }, { n: 4, p: "c25" }, { n: 30, p: "c50" }, { n: 1, p: "c100" }, { n: 9, p: "c200" }, { n: 22, p: "c25" }] };
  assert.equal(evaluate(num), null);
  assert.equal(evaluate({ ...num, win: 4 }), "c25");
});

test("tickets : fréquences simulées proches des chances annoncées", () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (const k of KINDS) {
    const N = 50000;
    let wins = 0, paid = 0, big = 0;
    for (let i = 0; i < N; i++) {
      const { prize } = drawTicket(k, rand);
      if (prize) { wins++; paid += valueOf(prize); }
      if (prize === jackpot(k)) big++;
    }
    assert.ok(Math.abs(wins / N - winRate(k)) < 0.01, `${k} : taux de victoires`);
    assert.ok(Math.abs(paid / N / TICKETS[k].price - returnRate(k)) < 0.15, `${k} : retour simulé ${paid / N / TICKETS[k].price}`); // les gros lots rares font varier
    assert.ok(big < N * 0.003, `${k} : le gros lot doit rester rare`);
  }
});
