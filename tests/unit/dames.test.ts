import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMove, initialBoard, legalMoves, N, play, start, type DamesState, type Piece } from "../../src/modules/games/dames.ts";

const sq = (r: number, c: number) => r * N + c;
/** Plateau vide avec des pièces : { "r,c": pièce }. */
const board = (pieces: Record<string, Piece>) => {
  const b: Piece[] = Array(N * N).fill("");
  for (const [k, p] of Object.entries(pieces)) {
    const [r, c] = k.split(",").map(Number);
    b[sq(r, c)] = p;
  }
  return b;
};
const state = (b: Piece[], turn = "A"): DamesState => ({ board: b, colors: { A: "w", B: "b" }, turn, winner: null, last: null, taken: { A: 0, B: 0 }, quiet: 0 });

test("dames : départ (20 pions chacun, cases sombres, 9 coups pour les blancs)", () => {
  const b = initialBoard();
  assert.equal(b.filter((p) => p === "w").length, 20);
  assert.equal(b.filter((p) => p === "b").length, 20);
  assert.ok(b.every((p, i) => !p || (Math.floor(i / N) + (i % N)) % 2 === 1));
  assert.equal(legalMoves(b, "w").length, 9);
  const { state: s } = start("A", "B", () => 0.1);
  assert.equal(s.colors[s.turn], "w", "les blancs commencent");
});

test("dames : la prise est obligatoire, même en arrière pour un pion", () => {
  const b = board({ "6,3": "w", "5,4": "b", "8,1": "w", "7,2": "b" }); // le pion (6,3) peut aussi prendre en arrière (7,2)
  const moves = legalMoves(b, "w");
  assert.ok(moves.every((m) => m.captured.length === 1), "plus de coups simples");
  assert.ok(moves.some((m) => m.path[1] === sq(4, 5)), "prise en avant");
  assert.ok(moves.some((m) => m.path[0] === sq(6, 3) && m.path[1] === sq(8, 1)) === false, "on ne se pose pas sur une pièce");
  const back = legalMoves(board({ "4,4": "w", "5,5": "b" }), "w");
  assert.deepEqual(back.map((m) => m.path), [[sq(4, 4), sq(6, 6)]], "prise en arrière");
});

test("dames : prise maximale obligatoire, rafles enchaînées", () => {
  // à gauche une prise simple ; à droite une rafle de deux pièces : seule la rafle est permise
  const b = board({ "7,4": "w", "6,3": "b", "6,5": "b", "4,7": "b" });
  const moves = legalMoves(b, "w");
  assert.deepEqual(moves.map((m) => m.path), [[sq(7, 4), sq(5, 6), sq(3, 8)]]);
  const after = applyMove(b, moves[0]);
  assert.equal(after[sq(6, 5)], "");
  assert.equal(after[sq(4, 7)], "");
  assert.equal(after[sq(6, 3)], "b", "la pièce non prise reste");
});

test("dames : une pièce prise n'est sautée qu'une fois", () => {
  // une dame encerclée : elle ne peut pas repasser sur une pièce déjà prise pendant la rafle
  const b = board({ "5,4": "W", "4,3": "b", "4,5": "b", "6,3": "b", "6,5": "b" });
  for (const m of legalMoves(b, "w")) assert.equal(new Set(m.captured).size, m.captured.length);
  // pion : rafle en zigzag, chaque pièce une seule fois
  const z = legalMoves(board({ "8,1": "w", "7,2": "b", "5,2": "b", "3,2": "b", "5,4": "b" }), "w");
  assert.ok(z.every((m) => new Set(m.captured).size === m.captured.length));
  assert.equal(z[0].captured.length, 3);
});

test("dames : la dame vole et se pose où elle veut derrière la pièce prise", () => {
  const b = board({ "9,0": "W", "6,3": "b" });
  const moves = legalMoves(b, "w");
  assert.deepEqual(moves.map((m) => m.path[1]).sort((x, y) => x - y), [sq(0, 9), sq(1, 8), sq(2, 7), sq(3, 6), sq(4, 5), sq(5, 4)].sort((x, y) => x - y));
  const free = legalMoves(board({ "9,0": "W" }), "w");
  assert.equal(free.length, 9, "toute la grande diagonale");
});

test("dames : un pion devient dame en finissant sur la dernière rangée, pas en passant", () => {
  const promoted = applyMove(board({ "1,2": "w" }), { path: [sq(1, 2), sq(0, 1)], captured: [] });
  assert.equal(promoted[sq(0, 1)], "W");
  // rafle qui touche la dernière rangée puis repart : reste un pion
  const b = board({ "2,3": "w", "1,4": "b", "1,6": "b" });
  const m = legalMoves(b, "w")[0];
  assert.deepEqual(m.path, [sq(2, 3), sq(0, 5), sq(2, 7)]);
  assert.equal(applyMove(b, m)[sq(2, 7)], "w");
});

test("dames : coups refusés, victoire quand l'adversaire n'a plus de coup, nulle après 25 coups de dames", () => {
  const s = state(board({ "6,3": "w", "5,4": "b" }));
  assert.equal(play(s, { path: [sq(6, 3), sq(5, 2)] }, "A"), null, "la prise est obligatoire");
  assert.equal(play(s, { path: [sq(6, 3), sq(4, 5)] }, "B"), null, "pas son tour");
  assert.equal(play(s, { path: "x" }, "A"), null);
  const won = play(s, { path: [sq(6, 3), sq(4, 5)] }, "A")!;
  assert.equal(won.winner, "A");
  assert.equal(won.taken.A, 1);

  const q = play({ ...state(board({ "9,0": "W", "0,1": "B" })), quiet: 49 }, { path: [sq(9, 0), sq(8, 1)] }, "A")!;
  assert.equal(q.winner, "draw", "25 coups de dames chacun sans prise : nulle");
  const pawn = play({ ...state(board({ "9,0": "W", "6,1": "w", "0,1": "B" })), quiet: 49 }, { path: [sq(6, 1), sq(5, 0)] }, "A")!;
  assert.equal(pawn.quiet, 0, "un coup de pion remet le compteur à zéro");
});
