import assert from "node:assert/strict";
import { test } from "node:test";
import { BASE_CAP, BUILDINGS, ITEMS, type ItemId, type Recipe } from "../../src/modules/farm/catalog.ts";
import { ch1 } from "../../src/modules/farm/story/ch1.ts";
import { maxOf } from "../../src/modules/farm/rules.ts";
import { personalUnlocks } from "../../src/modules/farm/story/state.ts";

/** Gain net d'une recette par heure si on la relance à chaque fois : valeur produite − ingrédients (au prix de vente). */
const net = (r: Recipe) => {
  const gain = ITEMS[r.out].price * r.qty;
  const cost = Object.entries(r.inputs).reduce((n, [k, v]) => n + (k === "coins" ? v! : ITEMS[k as ItemId].price * v!), 0);
  return gain - cost;
};

test("économie : chaque recette rapporte plus qu'elle ne coûte, mais plafonnée par le nombre d'objets", () => {
  for (const [id, b] of Object.entries(BUILDINGS)) for (const r of b.recipes) assert.ok(net(r) > 0, `${id}/${r.id} : ${net(r)}`);
  // gain maximal théorique par jour avec des relances parfaites toutes les heures (borne haute, jamais atteinte en vrai)
  const parHeure = (unlocks: string[]) =>
    Object.entries(BUILDINGS).reduce((total, [id, b]) => {
      if (!b.recipes.length || (b.requires && !unlocks.includes(b.requires))) return total;
      const n = maxOf(id as keyof typeof BUILDINGS, unlocks) ?? 99;
      return total + n * Math.max(...b.recipes.map((r) => (net(r) * 60) / Math.max(60, r.minutes)));
    }, 0);
  const debut = parHeure([]) * 24;
  const fin = parHeure(personalUnlocks(ch1, ch1.quests.map((q) => q.id))) * 24;
  assert.ok(debut < 1500, `début trop généreux : ${debut}`);
  assert.ok(fin > debut * 2, `la progression doit se sentir : ${debut} → ${fin}`);
  assert.ok(fin < 12000, `fin trop généreuse : ${fin}`);
});

test("économie : les plafonds de départ existent et l'histoire les relève", () => {
  assert.ok(BASE_CAP.planter && BASE_CAP.planter <= 6);
  const fin = personalUnlocks(ch1, ch1.quests.map((q) => q.id));
  assert.ok((maxOf("planter", fin) ?? 0) > (maxOf("planter", []) ?? 0));
});
