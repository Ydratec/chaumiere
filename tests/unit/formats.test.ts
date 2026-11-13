// Lancer : node --test 'tests/unit/*.test.ts'
import assert from "node:assert/strict";
import test from "node:test";
import { candidates, choiceTally, duoTally, rankTally, validAnswer } from "../../src/modules/questions/formats.ts";

const M = [{ id: "a", name: "Alice" }, { id: "b", name: "Bob" }, { id: "c", name: "Chloé" }];
const ids = (l: { id: string }[]) => l.map((x) => x.id);

test("candidats : sans la personne visée ; « avec qui » sans soi-même", () => {
  assert.deepEqual(ids(candidates(M, "vote", "a")), ["a", "b", "c"]);
  assert.deepEqual(ids(candidates(M, "with", "a")), ["b", "c"]);
  assert.deepEqual(ids(candidates(M, "rank", "a", "c")), ["a", "b"]);
  assert.deepEqual(ids(candidates(M, "with", "a", "b")), ["c"]);
});

test("validation des réponses selon le format", () => {
  const all = ["a", "b", "c"];
  assert.ok(validAnswer("vote", "b", all));
  assert.ok(!validAnswer("with", "a", ["b", "c"]));
  assert.ok(validAnswer("choice", "1", [], ["Chats", "Chiens"]));
  assert.ok(!validAnswer("choice", "2", [], ["Chats", "Chiens"]));
  assert.ok(validAnswer("rank", JSON.stringify(["c", "a", "b"]), all));
  assert.ok(!validAnswer("rank", JSON.stringify(["c", "a"]), all), "tout le monde doit être classé");
  assert.ok(!validAnswer("rank", JSON.stringify(["c", "c", "a"]), all), "une seule fois chacun");
  assert.ok(validAnswer("duo", JSON.stringify(["a", "c"]), all));
  assert.ok(!validAnswer("duo", JSON.stringify(["a", "a"]), all));
  assert.ok(!validAnswer("duo", "pas du json", all));
});

test("tu préfères : parts par choix", () => {
  const r = choiceTally([{ user_id: "a", content: "0" }, { user_id: "b", content: "1" }, { user_id: "c", content: "1" }, { user_id: "x", content: "7" }], 2);
  assert.equal(r.total, 3);
  assert.deepEqual(r.rows.map((x) => x.voters), [["a"], ["b", "c"]]);
  assert.deepEqual(r.rows.map((x) => Math.round(x.share * 100)), [33, 67]);
});

test("classement : ordre moyen et classements de chacun", () => {
  const r = rankTally([
    { user_id: "a", content: JSON.stringify(["b", "a", "c"]) },
    { user_id: "b", content: JSON.stringify(["b", "c", "a"]) },
    { user_id: "c", content: JSON.stringify(["a", "b", "c"]) },
  ], M);
  assert.equal(r.total, 3);
  assert.deepEqual(ids(r.rows), ["b", "a", "c"]); // b : (1+1+2)/3 ; a : (2+3+1)/3 ; c : (3+2+3)/3
  assert.equal(r.rows[0].avg?.toFixed(2), "1.33");
  assert.deepEqual(r.lists[1].order, ["b", "c", "a"]);
});

test("duos : A+B = B+A, les plus choisis d'abord", () => {
  const r = duoTally([
    { user_id: "a", content: JSON.stringify(["b", "c"]) },
    { user_id: "b", content: JSON.stringify(["c", "b"]) },
    { user_id: "c", content: JSON.stringify(["a", "b"]) },
  ]);
  assert.equal(r.total, 3);
  assert.deepEqual(r.rows[0], { pair: ["b", "c"], voters: ["a", "b"] });
});
