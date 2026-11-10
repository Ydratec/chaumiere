import assert from "node:assert/strict";
import { test } from "node:test";
import { BOOSTER, BY_ID, CARDS, claimKey, offersOf, winners, drawBooster, drawCard, drawVariant, keyOf, RARITIES, splitKey, testBooster, toImport, VARIANT_IDS } from "../../src/modules/tcg/cards.ts";

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
  const p = RARITIES.L.weight / Object.values(RARITIES).reduce((n, r) => n + r.weight, 0);
  assert.ok(Math.abs(legend / 20000 - p) < 0.01, `légendaires : ${legend}`);
});

test("tcg : versions alternatives (tirage, clés, booster de test)", () => {
  assert.equal(drawVariant("C", () => 0), "rainbow");
  assert.equal(drawVariant("L", () => 0.4), "rainbow"); // 1 chance sur 2 pour la Légendaire
  assert.equal(drawVariant("C", () => 0.9), undefined);
  assert.deepEqual(splitKey(keyOf("aix", "rainbow")), { id: "aix", variant: "rainbow" });
  assert.deepEqual(splitKey("aix"), { id: "aix", variant: undefined });
  assert.deepEqual(splitKey("aix@inconnue"), { id: "aix", variant: undefined });
  const t = testBooster().map(splitKey);
  assert.equal(t.length, BOOSTER.size);
  assert.deepEqual(t.map((c) => c.variant), [undefined, undefined, ...Array(BOOSTER.size - 2).fill(VARIANT_IDS[0])]);
  for (const c of [...t, ...drawBooster().map(splitKey)]) assert.ok(BY_ID[c.id], c.id);
});

test("tcg : gagnants du défi (ex aequo compris)", () => {
  assert.deepEqual(winners([{ user: "a", solved: true, score: 3 }, { user: "b", solved: true, score: 3 }, { user: "c", solved: true, score: 5 }, { user: "d", solved: false, score: 0 }]), ["a", "b"]);
  assert.deepEqual(winners([{ user: "d", solved: false, score: 0 }]), []);
});

test("tcg : boosters du jour", () => {
  const base = { answered: false, wonYesterday: false, taken: new Set<string>(), day: "2026-11-10", yesterday: "2026-11-09" };
  assert.deepEqual(offersOf(base), { question: "todo", win: null, buys: 0 });
  assert.deepEqual(offersOf({ ...base, answered: true, wonYesterday: true }), { question: "ready", win: "ready", buys: 0 });
  const taken = new Set([claimKey.question("2026-11-10"), claimKey.win("2026-11-09"), claimKey.buy("2026-11-10", 1), claimKey.buy("2026-11-10", 2), claimKey.buy("2026-11-09", 3)]);
  assert.deepEqual(offersOf({ ...base, answered: true, wonYesterday: true, taken }), { question: "done", win: "done", buys: 2 });
});

test("tcg : reprise d'une collection locale (cartes valides seulement, les plus rares d'abord)", () => {
  const legend = CARDS.find((c) => c.rarity === "L")!.id;
  const common = CARDS.find((c) => c.rarity === "C")!.id;
  const rare = CARDS.find((c) => c.rarity === "PR")!.id;
  const out = toImport({ [common]: 2, [legend]: 1, [keyOf(common, "rainbow")]: 1, [rare]: 1, inconnue: 3, [`${rare}@faux`]: 1, [legend + "@rainbow"]: 0, [rare + "x"]: 1.5 });
  assert.deepEqual(out, [keyOf(common, "rainbow"), legend, rare, common, common]);
  assert.deepEqual(toImport(null), []);
  assert.deepEqual(toImport("n'importe quoi"), []);
});
