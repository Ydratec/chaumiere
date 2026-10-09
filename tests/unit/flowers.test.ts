import assert from "node:assert/strict";
import { test } from "node:test";
import { ITEMS } from "../../src/modules/farm/catalog.ts";
import { BOUQUET_MAX, FLOWERS, giftError, isFlower, pickFlower, rarityOf } from "../../src/modules/farm/flowers.ts";

test("fleurs : une seule graine, tirage pondéré, la plus rare est la plus précieuse", () => {
  assert.equal(FLOWERS.reduce((n, f) => n + f.weight, 0), 100);
  assert.ok(FLOWERS.every((f) => f.id in ITEMS && isFlower(f.id)));
  // tirage déterministe : chaque tranche de [0, 1) donne la bonne fleur
  assert.equal(pickFlower(() => 0), "flower");
  assert.equal(pickFlower(() => 0.39), "flower");
  assert.equal(pickFlower(() => 0.4), "poppy");
  assert.equal(pickFlower(() => 0.995), "moonflower");
  // fréquences sur beaucoup de tirages
  let seed = 12345;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const count: Record<string, number> = {};
  for (let i = 0; i < 20000; i++) {
    const f = pickFlower(rand);
    count[f] = (count[f] ?? 0) + 1;
  }
  const moon = count.moonflower ?? 0, cosmos = count.flower ?? 0;
  assert.ok(cosmos > moon * 10, "la fleur de lune est vraiment rare");
  // plus c'est rare, plus ça vaut cher ; la fleur de lune est la plus précieuse et « légendaire »
  const sorted = [...FLOWERS].sort((a, b) => b.weight - a.weight);
  sorted.slice(1).forEach((f, i) => assert.ok(ITEMS[f.id].price >= ITEMS[sorted[i].id].price, f.id));
  assert.equal(rarityOf("moonflower"), "légendaire");
  assert.equal(rarityOf("flower"), "commune");
});

test("cadeau : une fleur ou un bouquet de fleurs seulement, taille limitée", () => {
  assert.equal(giftError({ rose: 1 }), null);
  assert.equal(giftError({ rose: 2, tulip: 1, moonflower: 1 }), null);
  assert.equal(giftError({}), "Choisis des fleurs à offrir.");
  assert.equal(giftError({ wheat: 1 }), "Choisis des fleurs à offrir.");
  assert.equal(giftError({ rose: 0 }), "Choisis des fleurs à offrir.");
  assert.equal(giftError({ rose: 1.5 }), "Choisis des fleurs à offrir.");
  assert.equal(giftError({ rose: BOUQUET_MAX, tulip: 1 }), `Un bouquet compte au plus ${BOUQUET_MAX} fleurs.`);
});

test("pot : la fleur est tirée à la plantation (« flower:poppy ») et reste la même jusqu'à la récolte", async () => {
  const { producedOf, recipeOf, applyMove } = await import("../../src/modules/farm/rules.ts");
  const pot = (item: string | null) => ({ x: 0, y: 0, kind: "pot", item, started_at: null, ready_at: item ? "2026-01-01T00:00:00Z" : null });
  assert.equal(recipeOf("pot", "flower:poppy")?.id, "flower");
  assert.equal(producedOf(pot("flower:poppy")), "poppy");
  assert.equal(producedOf(pot("flower")), "flower"); // ancienne graine : pas encore de variété
  assert.equal(producedOf({ ...pot("wheat"), kind: "planter" }), "wheat");
  assert.equal(producedOf(pot(null)), undefined);
  const f = { tiles: [pot("flower:moonflower")], items: {}, unlocks: [] };
  const r = applyMove(f, { kind: "collect", x: 0, y: 0 }, Date.parse("2026-01-02T00:00:00Z"));
  assert.ok("state" in r && r.state.items.moonflower === 1, "la fleur de lune arrive dans la réserve");
});
