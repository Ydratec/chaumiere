import assert from "node:assert/strict";
import { test } from "node:test";
import { canWear, isUnique, readCharacter, skinKey, UNIQUE_SPECIES } from "../../src/modules/characters/catalog.ts";

test("personnages uniques : sept, pas gratuits, seulement pour celui qui l'a reçu", () => {
  assert.deepEqual(UNIQUE_SPECIES, ["unicorn", "penguin", "dragon", "fox", "whale", "schrodinger", "frog", "shark"]);
  assert.ok(isUnique("dragon") && !isUnique("cat") && !isUnique("inconnu"));
  const dragon = { species: "dragon" as const, color: 0, accessory: null };
  assert.equal(canWear(dragon, [], []), false, "pas sans l'avoir reçu");
  assert.equal(canWear(dragon, [skinKey("species", "dragon")], []), true);
  assert.equal(canWear({ species: "cat", color: 0, accessory: null }, [], []), true, "le chat reste gratuit");
  assert.equal(readCharacter({ species: "frog", color: 2, accessory: null }, "x").species, "frog", "un personnage unique enregistré se relit");
});
