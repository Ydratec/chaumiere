// Lancer : node --test 'tests/unit/*.test.ts'
import assert from "node:assert/strict";
import test from "node:test";
import { flip, newGame } from "../../src/modules/games/memory.ts";

test("partie complète : paire, ratage, changement de tour, victoire", () => {
  const { deck, state } = newGame("A", "B", () => 0.9); // 0.9 → tour de B, plateau déterministe
  let s = state;
  assert.equal(s.turn, "B");
  assert.equal(flip(s, deck, 0, "A"), null); // pas son tour

  const partner = (i: number) => deck.findIndex((v, j) => j !== i && v === deck[i]);
  const other = (i: number) => deck.findIndex((v) => v !== deck[i]);

  // B rate : le tour passe à A, la paire reste visible
  s = flip(s, deck, 0, "B")!;
  s = flip(s, deck, other(0), "B")!;
  assert.equal(s.turn, "A");
  assert.equal(s.flipped.length, 2);

  // A retourne une carte : la paire ratée est masquée
  s = flip(s, deck, 0, "A")!;
  assert.equal(s.cards[other(0)], null);
  assert.equal(flip(s, deck, 0, "A"), null); // même carte deux fois
  s = flip(s, deck, partner(0), "A")!;
  assert.equal(s.scores.A, 1);
  assert.equal(s.turn, "A"); // paire trouvée : A rejoue

  // A termine le plateau
  for (let i = 0; i < deck.length; i++) {
    if (s.matched[i]) continue;
    s = flip(s, deck, i, "A")!;
    s = flip(s, deck, partner(i), "A")!;
  }
  assert.equal(s.winner, "A");
  assert.equal(flip(s, deck, 0, "A"), null); // partie finie
});
