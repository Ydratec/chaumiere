// Lancer : node --test 'tests/unit/*.test.ts'
import assert from "node:assert/strict";
import test from "node:test";
import { tally } from "../../src/modules/questions/tally.ts";

test("vote : tri par voix, barres relatives, votes invalides ignorés", () => {
  const members = [{ id: "a", name: "Alice" }, { id: "b", name: "Bob" }, { id: "c", name: "Chloé" }];
  const votes = [
    { user_id: "a", content: "b" },
    { user_id: "b", content: "b" },
    { user_id: "c", content: "a" },
    { user_id: "x", content: "zzz" }, // vote pour un non-membre
  ];
  const r = tally(votes, members);
  assert.equal(r.total, 3);
  assert.deepEqual(r.rows.map((x) => x.id), ["b", "a", "c"]);
  assert.deepEqual(r.rows[0].voters, ["a", "b"]);
  assert.deepEqual(r.rows.map((x) => x.share), [1, 0.5, 0]);
  assert.equal(tally([], members).rows[0].share, 0); // personne n'a voté : pas de division par zéro
});
