// Lancer : node --test 'tests/unit/*.test.ts'
import assert from "node:assert/strict";
import test from "node:test";
import { EDGES, H, PIECES, W, buildGrid, generate, mix, pieceCells, play, start, trace, wave, type Grid } from "../../src/modules/games/orapa.ts";

const empty = (): Grid => Array(W * H).fill(null);
const at = (x: number, y: number) => y * W + x;
// Une grille valide : les 5 gemmes éloignées les unes des autres.
const PLACEMENTS = [
  { x: 0, y: 0, rot: 0 }, { x: 4, y: 0, rot: 0 }, { x: 0, y: 4, rot: 0 },
  { x: 6, y: 4, rot: 0 }, { x: 0, y: 8, rot: 0 }, { x: 5, y: 8, rot: 0 },
];

test("onde : ligne droite, demi-tour, quart de tour, transparente, absorption", () => {
  const g = empty();
  assert.deepEqual(wave(g, "H3"), { to: "B3", colors: [] }); // traverse la colonne 3

  g[at(2, 3)] = { s: "sq", c: "red" };
  assert.deepEqual(wave(g, "H3"), { to: "H3", colors: ["red"] }); // carré : demi-tour

  g[at(2, 3)] = { s: "sw", c: "red" }; // triangle plein en bas à gauche
  assert.deepEqual(wave(g, "H3"), { to: "D4", colors: ["red"] }); // entre par le haut (diagonale) → part à droite, ligne 4
  assert.deepEqual(wave(g, "G4"), { to: "G4", colors: ["red"] }); // arrive sur le côté gauche (droit) → demi-tour

  g[at(5, 3)] = { s: "se", c: "clear" }; // transparente : dévie sans colorer
  assert.deepEqual(wave(g, "H3"), { to: "H6", colors: ["red"] }); // arrive par sa diagonale → remonte la colonne 6
  g[at(5, 3)] = { s: "nw", c: "clear" };
  assert.deepEqual(wave(g, "H3"), { to: "H3", colors: ["red"] }); // arrive sur son côté droit → demi-tour, ressort par l'entrée

  g[at(5, 3)] = null;
  g[at(7, 3)] = { s: "sq", c: "black" };
  assert.deepEqual(wave(g, "H3"), { to: null, colors: ["red"] }); // absorbée par la gemme noire
});

test("tracé : suit l'onde case par case", () => {
  const g = empty();
  g[at(2, 3)] = { s: "sw", c: "red" };
  const { path } = trace(g, "H3");
  assert.deepEqual(path[0], [2, -1]);
  assert.deepEqual(path.at(-1), [W, 3]);
  assert.ok(path.some(([x, y]) => x === 2 && y === 3)); // passe par la diagonale
});

test("mélange des couleurs", () => {
  assert.equal(mix(["red", "blue"]).name, "violet");
  assert.equal(mix([]).name, "sans couleur");
});

test("plateaux aléatoires : toutes les gemmes, trajets réversibles", () => {
  const cells = PIECES.reduce((n, p) => n + p.cells.length, 0);
  for (let n = 0; n < 30; n++) {
    const g = generate();
    assert.equal(g.filter(Boolean).length, cells);
    for (const e of EDGES) {
      const r = wave(g, e.id);
      if (r.to) assert.equal(wave(g, r.to).to, e.id, `${e.id} → ${r.to} n'est pas réversible`);
    }
  }
});

test("pièce tournée : 4 quarts de tour reviennent au départ, formes cohérentes", () => {
  PIECES.forEach((p, k) => {
    assert.deepEqual(pieceCells(k, 4), pieceCells(k, 0));
    assert.equal(pieceCells(k, 1).length, p.cells.length);
  });
  // grand triangle tourné d'un quart : angle droit en haut à gauche
  assert.deepEqual(pieceCells(0, 1), [[1, 0, "nw"], [0, 0, "sq"], [0, 1, "nw"]]);
});

test("grille composée : valide, ou refusée si hors grille, chevauchement ou contact", () => {
  assert.equal(buildGrid(PLACEMENTS)!.filter(Boolean).length, 20);
  const moved = (k: number, p: object) => PLACEMENTS.map((q, i) => (i === k ? p : q));
  assert.equal(buildGrid(moved(5, { x: 7, y: 9, rot: 0 })), null); // hors grille
  assert.equal(buildGrid(moved(5, { x: 0, y: 0, rot: 0 })), null); // chevauche le triangle jaune
  assert.equal(buildGrid(moved(5, { x: 2, y: 1, rot: 0 })), null); // touche le triangle jaune par un côté
  assert.equal(buildGrid(PLACEMENTS.slice(1)), null); // une gemme manque
});

test("partie : chacun pose sa grille, puis devine celle de l'autre", () => {
  let { state: s } = start("A", "B");
  let secrets = {};
  const a = s.turn, b = a === "A" ? "B" : "A";
  const go = (move: object, p: string) => {
    const r = play(s, secrets, move, p);
    if (r) { s = r.state; secrets = { ...secrets, ...r.secretPatch }; }
    return r;
  };

  assert.ok(go({ kind: "setup", placements: PLACEMENTS }, "A"));
  assert.equal(s.phase, "setup");
  assert.equal(go({ kind: "setup", placements: PLACEMENTS }, "A"), null); // une seule fois
  assert.equal(go({ kind: "wave", from: "H1" }, a), null); // pas avant que les deux grilles soient posées
  const gridB = PLACEMENTS.map((p, k) => (k === 5 ? { x: 3, y: 8, rot: 0 } : p));
  assert.ok(go({ kind: "setup", placements: gridB }, "B"));
  assert.equal(s.phase, "play");

  // L'onde de A part dans la grille de B.
  go({ kind: "wave", from: "H6" }, a);
  assert.deepEqual(s.log.at(-1), { by: a, from: "H6", ...wave(buildGrid(a === "A" ? gridB : PLACEMENTS)!, "H6") });
  assert.equal(s.turn, b);
  assert.equal(go({ kind: "wave", from: "H2" }, a), null); // pas son tour

  go({ kind: "guess", grid: empty() }, a); // vérifier est permis hors de son tour…
  assert.equal(s.turn, b); // …et ne fait pas passer le tour
  assert.equal(s.winner, null);
  assert.equal(go({ kind: "guess", grid: empty() }, "C"), null); // spectateur

  go({ kind: "guess", grid: buildGrid(a === "A" ? gridB : PLACEMENTS) }, a);
  assert.equal(s.winner, a);
  assert.deepEqual(Object.keys(s.solutions!).sort(), ["A", "B"]);
});
