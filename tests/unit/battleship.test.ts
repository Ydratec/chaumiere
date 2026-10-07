// Lancer : node --test 'tests/unit/*.test.ts'
import assert from "node:assert/strict";
import test from "node:test";
import { FLEET, SIZE, play, randomFleet, start } from "../../src/modules/games/battleship.ts";

test("flotte aléatoire : bonnes tailles, navires droits qui ne se touchent pas", () => {
  for (let n = 0; n < 50; n++) {
    const ships = randomFleet();
    assert.deepEqual(ships.map((s) => s.length), FLEET);
    const owner = new Map(ships.flatMap((s, k) => s.map((c) => [c, k] as const)));
    for (const [c, k] of owner) {
      const r = Math.floor(c / SIZE), col = c % SIZE;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr, cc = col + dc;
          if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) continue;
          const o = owner.get(rr * SIZE + cc);
          assert.ok(o === undefined || o === k, "deux navires se touchent");
        }
    }
  }
});

test("tirs : tour alterné, coulé, victoire, coups illégaux", () => {
  const { state, secret } = start("A", "B");
  let s = state;
  const shooter = s.turn, other = shooter === "A" ? "B" : "A";
  assert.equal(play(s, secret, { cell: 0 }, other), null); // pas son tour

  // Le tireur vise toute la flotte adverse ; l'autre tire dans l'eau entre-temps.
  const targets = secret[other].flat();
  const water = Array.from({ length: SIZE * SIZE }, (_, i) => i).filter((i) => !secret[shooter].flat().includes(i));
  for (const [k, cell] of targets.entries()) {
    s = play(s, secret, { cell }, shooter)!;
    assert.ok(s.shots[shooter].at(-1)!.hit);
    if (k === targets.length - 1) break;
    assert.equal(s.turn, other);
    assert.equal(play(s, secret, { cell: water[k] }, other)!.shots[other].at(-1)!.hit, false);
    s = play(s, secret, { cell: water[k] }, other)!;
  }
  assert.equal(s.sunk[shooter].length, FLEET.length);
  assert.equal(s.winner, shooter);
  assert.equal(play(s, secret, { cell: 63 }, shooter), null); // partie finie
});
