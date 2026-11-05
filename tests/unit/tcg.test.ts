import assert from "node:assert/strict";
import { test } from "node:test";
import { BOOSTER, BY_ID, CARDS, drawBooster, drawCard, RARITIES } from "../../src/modules/tcg/cards.ts";

test("tcg : chaque rareté a au moins une carte, les ids sont uniques", () => {
  for (const r of Object.keys(RARITIES)) assert.ok(CARDS.some((c) => c.rarity === r), r);
  assert.equal(Object.keys(BY_ID).length, CARDS.length);
});

test("tcg : le tirage respecte les extrêmes et la taille du booster", () => {
  assert.equal(drawCard(() => 0).rarity, "C");
  assert.equal(drawCard(() => 0.9999).rarity, "L");
  assert.equal(drawBooster().length, BOOSTER.size);
  let legend = 0;
  for (let i = 0; i < 20000; i++) if (drawCard().rarity === "L") legend++;
  assert.ok(legend > 100 && legend < 320, `légendaires : ${legend}`); // ~1 %
});
