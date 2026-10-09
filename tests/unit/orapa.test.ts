// Lancer : node --test 'tests/unit/*.test.ts'
import assert from "node:assert/strict";
import test from "node:test";
import { flipInPlace, gridProblems, mirrorCells, EDGES, H, PIECES, W, buildGrid, centerAt, generate, mix, pieceCells, pieceSize, placementError, play, rotateInPlace, start, trace, wave, type Grid } from "../../src/modules/games/orapa.ts";

const empty = (): Grid => Array(W * H).fill(null);
const at = (x: number, y: number) => y * W + x;
// Une grille valide : les 5 gemmes éloignées les unes des autres.
// Ordre de PIECES : triangle jaune, parallélogramme rouge, grand triangle bleu, grand triangle blanc,
// losange blanc, triangle transparent, bloc noir.
const PLACEMENTS = [
  { x: 0, y: 0, rot: 0 }, { x: 4, y: 0, rot: 0 }, { x: 0, y: 3, rot: 0 }, { x: 4, y: 6, rot: 0 },
  { x: 5, y: 2, rot: 0 }, { x: 0, y: 8, rot: 0 }, { x: 3, y: 9, rot: 0 },
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
  assert.equal(buildGrid(PLACEMENTS)!.filter(Boolean).length, 26);
  const moved = (k: number, p: object) => PLACEMENTS.map((q, i) => (i === k ? p : q));
  assert.equal(buildGrid(moved(6, { x: 7, y: 9, rot: 0 })), null); // hors grille
  assert.equal(buildGrid(moved(6, { x: 0, y: 0, rot: 0 })), null); // chevauche le triangle jaune
  assert.equal(buildGrid(moved(6, { x: 2, y: 1, rot: 0 })), null); // touche le triangle jaune par un côté
  assert.equal(buildGrid(PLACEMENTS.slice(1)), null); // une gemme manque
});

test("contacts : pointe contre pointe ou contre côté droit permis ; deux côtés droits refusés ; bloc noir sans contact", () => {
  const moved = (k: number, p: object) => PLACEMENTS.map((q, i) => (i === k ? p : q));
  // le triangle transparent à côté du triangle jaune : sa pointe touche la pointe, puis le côté droit du jaune
  assert.ok(buildGrid(moved(5, { x: 2, y: 1, rot: 0 })), "pointe contre pointe");
  assert.ok(buildGrid(moved(5, { x: 1, y: 0, rot: 0 })), "pointe contre côté droit");
  // jaune (côté droit en bas) au-dessus du carré du parallélogramme (côté droit en haut) : refusé, et on dit où
  const p = gridProblems([{ x: 0, y: 0, rot: 0 }, { x: 0, y: 2, rot: 0 }]);
  assert.equal(p.length, 1);
  assert.deepEqual(p[0].pieces, [0, 1]);
  assert.deepEqual(p[0].cells.sort((a, b) => a - b), [9, 17]); // (1,1) et (1,2)
  assert.match(p[0].text, /deux côtés droits/);
  // bloc noir : même un coin touché est refusé
  const noir = gridProblems([{ x: 0, y: 0, rot: 0 }, null, null, null, null, null, { x: 2, y: 2, rot: 0 }]); // (1,1) du jaune, (2,2) du noir
  assert.equal(noir.length, 1);
  assert.match(noir[0].text, /bloc noir/);
  // chevauchement et hors plateau
  assert.match(gridProblems([{ x: 0, y: 0, rot: 0 }, null, null, null, null, null, { x: 0, y: 0, rot: 0 }])[0].text, /chevauchent/);
  assert.match(gridProblems([null, null, null, null, null, null, { x: 7, y: 9, rot: 0 }])[0].text, /sort du plateau/);
  assert.deepEqual(gridProblems(PLACEMENTS), []);
});

test("grilles générées : respectent les mêmes règles", () => {
  for (let n = 0; n < 50; n++) {
    const g = generate();
    assert.equal(g.filter(Boolean).length, 26);
  }
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
  const gridB = PLACEMENTS.map((p, k) => (k === 6 ? { x: 6, y: 9, rot: 0 } : p));
  assert.ok(go({ kind: "setup", placements: gridB }, "B"));
  assert.equal(s.phase, "play");

  // L'onde de A part dans la grille de B.
  go({ kind: "wave", from: "H6" }, a);
  assert.deepEqual(s.log.at(-1), { by: a, from: "H6", ...wave(buildGrid(a === "A" ? gridB : PLACEMENTS)!, "H6") });
  assert.equal(s.turn, b);
  assert.equal(go({ kind: "wave", from: "H2" }, a), null); // pas son tour

  assert.equal(go({ kind: "guess", grid: empty() }, a), null); // un essai ne se tente qu'à son tour
  assert.equal(go({ kind: "guess", grid: empty() }, "C"), null); // spectateur
  go({ kind: "wave", from: "H2" }, b);
  assert.equal(s.turn, a);
});

/** Partie prête à jouer : A joue en premier ; la grille de A est PLACEMENTS, celle de B est `gridB`. */
function ready() {
  let { state: s } = start("A", "B", () => 0);
  let secrets = {};
  const go = (move: object, p: string) => {
    const r = play(s, secrets, move, p);
    if (r) { s = r.state; secrets = { ...secrets, ...r.secretPatch }; }
    return r;
  };
  const gridB = PLACEMENTS.map((p, k) => (k === 6 ? { x: 6, y: 9, rot: 0 } : p));
  go({ kind: "setup", placements: PLACEMENTS }, "A");
  go({ kind: "setup", placements: gridB }, "B");
  return { go, st: () => s, right: (by: string) => ({ kind: "guess", grid: buildGrid(by === "A" ? gridB : PLACEMENTS) }), wrong: { kind: "guess", grid: empty() } };
}

test("essai : un seul par joueur, à son tour, et il coûte le tour ; une confirmation côté interface", () => {
  const g = ready();
  assert.equal(g.st().turn, "A");
  assert.ok(g.go(g.wrong, "A"));
  assert.equal(g.st().turn, "B"); // le tour passe
  assert.equal(g.st().winner, null);
  assert.deepEqual(g.st().log.at(-1), { by: "A", guess: true });
  assert.equal(g.go(g.wrong, "A"), null); // pas son tour
  g.go({ kind: "wave", from: "H1" }, "B");
  assert.equal(g.go(g.wrong, "A"), null); // son unique essai est déjà utilisé
  assert.ok(g.go({ kind: "wave", from: "H1" }, "A")); // mais il peut encore envoyer des ondes
});

test("essai : celui qui joue en premier et trouve laisse une dernière chance à l'autre (égalité s'il trouve)", () => {
  const g = ready();
  g.go(g.right("A"), "A"); // A joue en premier : B a un tour de moins
  assert.equal(g.st().winner, null);
  assert.equal(g.st().found, "A");
  assert.equal(g.st().turn, "B");
  assert.equal(g.go({ kind: "wave", from: "H1" }, "B"), null); // dernière chance : seulement un essai
  g.go(g.right("B"), "B");
  assert.equal(g.st().winner, "draw");
  assert.deepEqual(Object.keys(g.st().solutions!).sort(), ["A", "B"]);

  const h = ready();
  h.go(h.right("A"), "A");
  h.go(h.wrong, "B");
  assert.equal(h.st().winner, "A"); // l'autre a raté sa dernière chance

  // si l'autre a déjà gâché son essai, pas de dernière chance : le premier gagne tout de suite
  const k = ready();
  k.go({ kind: "wave", from: "H1" }, "A");
  k.go(k.wrong, "B");
  k.go({ kind: "wave", from: "H2" }, "A");
  k.go({ kind: "wave", from: "H3" }, "B");
  k.go(k.right("A"), "A");
  assert.equal(k.st().winner, "A");
});

test("essai : le second joueur qui trouve gagne tout de suite ; deux essais ratés = égalité", () => {
  const g = ready();
  g.go({ kind: "wave", from: "H1" }, "A");
  g.go(g.right("B"), "B"); // tours égaux
  assert.equal(g.st().winner, "B");

  const h = ready();
  h.go(h.wrong, "A");
  assert.equal(h.st().winner, null);
  h.go(h.wrong, "B");
  assert.equal(h.st().winner, "draw");
});

test("miroir : le parallélogramme rouge peut être posé retourné, les autres gemmes sont identiques à leur reflet", () => {
  const red = PIECES.findIndex((p) => p.color === "red");
  assert.deepEqual(pieceCells(red, 0), [[0, 0, "se"], [1, 0, "sq"], [2, 0, "nw"]]);
  assert.deepEqual(pieceCells(red, 0, 0, 0, true), [[2, 0, "sw"], [1, 0, "sq"], [0, 0, "ne"]]);
  // le reflet n'est aucune rotation du modèle d'origine (sinon il n'y aurait rien à retourner)
  const keys = (cells: ReturnType<typeof pieceCells>) => JSON.stringify([...cells].sort());
  assert.ok(![0, 1, 2, 3].some((r) => keys(pieceCells(red, r)) === keys(pieceCells(red, 0, 0, 0, true))));
  assert.deepEqual(pieceSize(red, 1, true), pieceSize(red, 1));
  const p = centerAt(red, 0, 4, 4, true);
  assert.equal(p.flip, true);
  assert.ok(!flipInPlace(red, p).flip);
  assert.ok(buildGrid(PLACEMENTS.map((q, i) => (i === red ? { ...q, flip: true } : q))), "grille valide avec la gemme retournée");
  // les autres gemmes : le reflet est une rotation du modèle d'origine
  PIECES.forEach((pc, k) => {
    if (pc.mirror) return;
    const flipped = keys(mirrorCells(pc.cells).map(([x, y, sh]) => [x, y, sh] as const) as never);
    assert.ok([0, 1, 2, 3].some((r) => keys(pieceCells(k, r)) === flipped), pc.name);
  });
});

test("éditeur : gemme centrée sous le doigt, recalée aux bords, rotation sur place, chevauchement", () => {
  // grand triangle bleu (4×2) centré sur (4, 5)
  assert.deepEqual(centerAt(2, 0, 4, 5), { x: 3, y: 5, rot: 0 });
  assert.deepEqual(centerAt(2, 0, 7, 9), { x: W - 4, y: H - 2, rot: 0 }); // au bord : recalé dans le plateau
  assert.deepEqual(centerAt(2, 0, 0, 0), { x: 0, y: 0, rot: 0 });

  const p = centerAt(2, 0, 4, 5);
  const r = rotateInPlace(2, p);
  assert.equal(r.rot, 1);
  assert.deepEqual(pieceSize(2, 1), { w: 2, h: 4 }); // tourné : 2×4
  assert.ok(Math.abs(r.x + 0.5 - (p.x + 1.5)) <= 1 && Math.abs(r.y + 1.5 - (p.y + 0.5)) <= 1, "centre à peu près gardé");
  assert.ok(pieceCells(2, r.rot, r.x, r.y).every(([x, y]) => x >= 0 && y >= 0 && x < W && y < H));
  assert.deepEqual(rotateInPlace(2, { x: 4, y: 0, rot: 3 }).rot, 0); // 4 quarts de tour

  const placed = PIECES.map(() => null) as ({ x: number; y: number; rot: number } | null)[];
  placed[0] = { x: 0, y: 0, rot: 0 };
  assert.equal(placementError(placed, 6, { x: 0, y: 1, rot: 0 }), "Une autre gemme est déjà là.");
  assert.equal(placementError(placed, 6, { x: 2, y: 1, rot: 0 }), null); // contact permis pendant l'édition
  assert.equal(placementError(placed, 6, { x: 7, y: 0, rot: 0 }), "Hors du plateau.");
  assert.equal(placementError(placed, 0, { x: 1, y: 0, rot: 0 }), null); // une gemme ne se gêne pas elle-même
});
