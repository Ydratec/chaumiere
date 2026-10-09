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
