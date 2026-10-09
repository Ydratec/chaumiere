// Lancer : node --test 'tests/unit/*.test.ts'
import assert from "node:assert/strict";
import test from "node:test";
import { BUILDINGS, ITEMS } from "../../src/modules/farm/catalog.ts";
import { around, duration, findPath, footprint, has, isReady, negate, placeError, progress, recipeOf, startError, tileAt, type Tile } from "../../src/modules/farm/rules.ts";

const field = (item: string | null = null, started = 0, ready = 0): Tile => ({
  x: 0, y: 0, kind: "planter", item,
  started_at: item ? new Date(started).toISOString() : null,
  ready_at: item ? new Date(ready).toISOString() : null,
});

test("catalogue cohérent : chaque recette produit un objet vendable et rentable", () => {
  for (const b of Object.values(BUILDINGS))
    for (const r of b.recipes) {
      assert.ok(ITEMS[r.out].price > 0, r.id);
      const cost = Object.entries(r.inputs).reduce((s, [k, v]) => s + (k === "coins" ? v! : ITEMS[k as keyof typeof ITEMS].price * v!), 0);
      assert.ok(ITEMS[r.out].price * r.qty > cost, `${r.id} doit rapporter plus qu'il ne coûte`);
    }
});

test("lancer une recette : tuile libre, bonne recette, ingrédients suffisants", () => {
  assert.equal(startError(field(), { coins: 1 }, "wheat"), null);
  assert.equal(startError(field(), { coins: 0 }, "wheat"), "Il te manque des ingrédients.");
  assert.equal(startError(field(), { coins: 9 }, "bread"), "Impossible ici.");
  assert.equal(startError(field("wheat", 0, 1), { coins: 9 }, "wheat"), "Déjà occupé.");
  assert.equal(startError(undefined, {}, "wheat"), "Rien à cet endroit.");
});

test("pousse en temps réel : prête à l'échéance, progression, accélération", () => {
  const t = field("wheat", 1000, 3000);
  assert.equal(isReady(t, 2999), false);
  assert.equal(isReady(t, 3000), true);
  assert.equal(progress(t, 2000), 0.5);
  assert.equal(duration(recipeOf("planter", "wheat")!), 120_000);
  assert.equal(duration(recipeOf("planter", "wheat")!, ["upgrade:speed"]), 90_000);
});

test("poser un objet : emprise, collisions, bords, limites, déplacement", () => {
  const bac = field(); // bac potager 2×2 en (0, 0)
  assert.deepEqual(footprint("planter", 3, 4), [{ x: 3, y: 4 }, { x: 4, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 5 }]);
  assert.equal(tileAt([bac], 1, 1), bac);
  assert.equal(tileAt([bac], 2, 0), undefined);
  assert.equal(placeError([bac], { coins: 100 }, "planter", 2, 0), null);
  assert.equal(placeError([bac], { coins: 100 }, "planter", 1, 1), "Il y a déjà quelque chose ici."); // chevauche d'une case
  assert.equal(placeError([bac], { coins: 100 }, "planter", 11, 0), "Ça dépasse de la ferme."); // 2 de large en x=11
  assert.equal(placeError([bac], { coins: 100 }, "pot", 11, 11), null);
  assert.equal(placeError([bac], { coins: 5 }, "pot", 5, 5), "Pas assez de pièces.");
  assert.equal(placeError([bac, { ...field(), x: 4, kind: "coop" }], { coins: 100 }, "coop", 8, 0, ["b:coop"]), "Tu as déjà un poulailler.");
  assert.equal(placeError([], { coins: 100 }, "coop", 8, 0), "À débloquer avec l'histoire.");
  assert.equal(placeError([bac], { coins: 0 }, "planter", 1, 0, [], bac), null); // déplacer : chevauche sa propre place, gratuit
});

test("chemin du chat : contourne les objets, va à côté d'un objet", () => {
  const mur: Tile[] = Array.from({ length: 5 }, (_, i) => ({ ...field(), kind: "pot", x: 2, y: i })); // colonne de pots en x=2, y=0..4
  const path = findPath(mur, 12, { x: 0, y: 0 }, [{ x: 4, y: 0 }])!;
  assert.equal(path.at(-1)!.x, 4);
  assert.ok(path.every((c) => !tileAt(mur, c.x, c.y)), "ne traverse pas d'objet");
  assert.ok(path.length >= 14, "fait le tour par en bas"); // descendre à y=5, traverser, remonter
  assert.deepEqual(findPath([], 12, { x: 3, y: 3 }, [{ x: 3, y: 3 }]), []);
  const enferme: Tile[] = [{ ...field(), kind: "pot", x: 1, y: 0 }, { ...field(), kind: "pot", x: 0, y: 1 }];
  assert.equal(findPath(enferme, 12, { x: 0, y: 0 }, [{ x: 5, y: 5 }]), null);

  const bac = { ...field(), x: 4, y: 4 };
  const near = around(bac, 12);
  assert.equal(near.length, 8); // 2 cases par côté, sans les coins
  assert.ok(near.some((c) => c.x === 3 && c.y === 4) && !near.some((c) => c.x === 3 && c.y === 3));
});

test("inventaire : possession et retrait", () => {
  assert.ok(has({ wheat: 3, egg: 1 }, { wheat: 3 }));
  assert.ok(!has({ wheat: 2 }, { wheat: 3 }));
  assert.deepEqual(negate({ wheat: 3, coins: 1 }), { wheat: -3, coins: -1 });
});

test("projets : prérequis, reste à donner, complétion", async () => {
  const { PROJECTS, activeProjects, isComplete, remaining } = await import("../../src/modules/farm/projects.ts");
  const first = activeProjects([]).map((p) => p.key);
  assert.ok(first.includes("game:battleship"));
  assert.ok(!first.includes("game:orapa")); // après la bataille navale
  assert.ok(activeProjects(["game:battleship"]).some((p) => p.key === "game:orapa"));
  assert.ok(!activeProjects(["game:battleship"]).some((p) => p.key === "game:battleship"));

  const bs = PROJECTS.find((p) => p.key === "game:battleship")!;
  assert.equal(remaining(bs, { wheat: 25 }, "wheat"), 5);
  assert.equal(remaining(bs, { wheat: 99 }, "wheat"), 0);
  assert.ok(!isComplete(bs, { wheat: 30 }));
  assert.ok(isComplete(bs, { wheat: 30, carrot: 10 }));
  for (const p of PROJECTS) if (p.after) assert.ok(PROJECTS.some((q) => q.key === p.after), `${p.key} : prérequis inconnu`);
});

test("déblocages : terrain, 2e poulailler, décorations, engrais", async () => {
  const { gridH, maxOf } = await import("../../src/modules/farm/rules.ts");
  assert.equal(gridH([]), 12);
  assert.equal(gridH(["upgrade:land"]), 16);
  assert.equal(placeError([], { coins: 100 }, "planter", 0, 13), "Ça dépasse de la ferme.");
  assert.equal(placeError([], { coins: 100 }, "planter", 0, 13, ["upgrade:land"]), null);
  assert.equal(maxOf("coop", ["upgrade:coop2"]), 2);
  assert.equal(placeError([], { coins: 100 }, "flowers", 0, 0), "À débloquer avec un projet de la salle.");
  assert.equal(placeError([], { coins: 100 }, "flowers", 0, 0, ["cosmetic:decor"]), null);
});

test("offres d'échange : un objet contre un autre, quantités raisonnables", async () => {
  const { offerError } = await import("../../src/modules/farm/rules.ts");
  assert.equal(offerError({ wheat: 10 }, { egg: 2 }), null);
  assert.equal(offerError({ wheat: 10 }, { wheat: 2 }), "Choisis deux objets différents.");
  assert.equal(offerError({ wheat: 0 }, { egg: 2 }), "Quantités entre 1 et 999.");
  assert.equal(offerError({ wheat: 1.5 }, { egg: 2 }), "Quantités entre 1 et 999.");
  assert.equal(offerError({ gold: 1 } as never, { egg: 2 }), "Objet inconnu.");
  assert.equal(offerError({}, { egg: 2 }), "Choisis un objet à donner et un à recevoir.");
});

test("coup appliqué tout de suite : planter, récolter, vendre, construire, déplacer, démolir", async () => {
  const { applyMove } = await import("../../src/modules/farm/rules.ts");
  type FarmState = import("../../src/modules/farm/rules.ts").FarmState;
  const bac: Tile = { x: 0, y: 0, kind: "planter", item: null, started_at: null, ready_at: null };
  let f: FarmState = { tiles: [bac], items: { coins: 30 }, unlocks: [] };
  const ok = (r: ReturnType<typeof applyMove>) => { assert.ok("state" in r, "error" in r ? r.error : ""); return (r as { state: typeof f }).state; };

  f = ok(applyMove(f, { kind: "start", x: 1, y: 1, recipe: "wheat" }, 0)); // n'importe quelle case du bac
  assert.equal(f.items.coins, 29);
  assert.equal(f.tiles[0].item, "wheat");
  assert.deepEqual(applyMove(f, { kind: "collect", x: 0, y: 0 }, 60_000), { error: "Pas encore prêt." });
  f = ok(applyMove(f, { kind: "collect", x: 0, y: 0 }, 120_000));
  assert.equal(f.items.wheat, 2);
  assert.equal(f.tiles[0].item, null);

  f = ok(applyMove(f, { kind: "sell", item: "wheat", qty: 2 }, 0));
  assert.deepEqual([f.items.wheat, f.items.coins], [0, 31]);
  assert.deepEqual(applyMove(f, { kind: "sell", item: "wheat", qty: 1 }, 0), { error: "Tu n'en as pas assez." });

  f = ok(applyMove(f, { kind: "build", x: 4, y: 4, building: "pot" }, 0));
  assert.equal(f.items.coins, 23);
  assert.deepEqual(applyMove(f, { kind: "build", x: 1, y: 1, building: "pot" }, 0), { error: "Il y a déjà quelque chose ici." });
  f = ok(applyMove(f, { kind: "move", x: 4, y: 4, to: { x: 6, y: 6 } }, 0));
  assert.ok(f.tiles.some((t) => t.kind === "pot" && t.x === 6 && t.y === 6));
  f = ok(applyMove(f, { kind: "clear", x: 6, y: 6 }, 0));
  assert.equal(f.tiles.length, 1);
});

test("serres aux règles : on retire d'abord les objets au repos, puis les récoltes prêtes, puis les moins avancés", async () => {
  const { excessTiles } = await import("../../src/modules/farm/rules.ts");
  const now = Date.parse("2026-01-01T12:00:00Z");
  const t = (x: number, y: number, ready: string | null = null): Tile => ({ x, y, kind: "pot", item: ready ? "flower" : null, started_at: null, ready_at: ready });
  const pret = "2026-01-01T11:00:00Z", tot = "2026-01-01T12:04:00Z", tard = "2026-01-01T12:30:00Z";
  // plafond de départ : 3 pots. 5 pots → 2 en trop, les deux au repos, les plus bas d'abord
  const repos = [t(0, 0), t(1, 0), t(2, 0, pret), t(3, 5), t(4, 5)];
  assert.deepEqual(excessTiles(repos, [], now).map((x) => [x.x, x.y]), [[4, 5], [3, 5]]);
  assert.deepEqual(excessTiles(repos, ["cap:pot:5"], now), []);
  // tous occupés : la récolte prête part avant, puis celui qui a le moins avancé (prêt le plus tard)
  const occupes = [t(0, 0, tot), t(1, 0, tard), t(2, 0, pret), t(3, 0, tot)];
  assert.deepEqual(excessTiles(occupes, [], now).map((x) => x.x), [2]);
  const cinq = [...occupes, t(4, 0, tard)];
  assert.deepEqual(excessTiles(cinq, [], now).map((x) => x.x), [2, 1]); // le prêt, puis un des deux « prêts le plus tard »
  assert.deepEqual(excessTiles([], [], now), []);
});
