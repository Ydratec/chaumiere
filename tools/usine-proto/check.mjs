// Vérifie le moteur du jeu sans navigateur : charge public/usine/jeu/{meta,game}.js dans une fausse page et joue des scénarios.
// Lancer depuis la racine du dépôt : node tools/usine-proto/check.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

// ---- fausse page : juste ce que game.js touche au chargement
const any = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : any()), apply: () => any() });
const els = new Map();
const el = (id) => {
  if (!els.has(id)) els.set(id, {
    id, style:{}, dataset:{}, hidden:false, textContent:"", innerHTML:"", childNodes:[], attributes:[], width:0, height:0, disabled:false,
    classList:{ add(){}, remove(){}, toggle(){}, contains:() => false }, addEventListener(){}, appendChild(){}, contains:() => false,
    setPointerCapture(){}, getContext:() => any(), getBoundingClientRect:() => ({ left:0, top:0, width:400, height:700 }), get parentElement() { return el("parent"); },
  });
  return els.get(id);
};
const store = new Map();
const ctx = {
  console, Math, JSON, Date, Map, Set, Object, Array, Number, String, Promise, URLSearchParams, Proxy, setTimeout, clearTimeout,
  setInterval:() => 0, requestAnimationFrame:() => 0, performance, devicePixelRatio:1, innerWidth:400, innerHeight:700,
  location:{ search:"", hash:"", pathname:"/" }, history:{ replaceState(){} }, navigator:{},
  localStorage:{ getItem:(k) => store.get(k) ?? null, setItem:(k, v) => store.set(k, v), removeItem:(k) => store.delete(k) },
  ResizeObserver:class { observe(){} }, Image:class { complete = false; },
  document:{ getElementById:el, querySelectorAll:() => [], createElement:() => el("tmp" + Math.random()), body:el("body"), addEventListener(){}, hidden:false },
  addEventListener(){},
};
ctx.window = ctx;
vm.createContext(ctx);
const root = new URL("../../public/usine/jeu/", import.meta.url);
vm.runInContext(readFileSync(new URL("meta.js", root), "utf8"), ctx);

// ---- scénarios, joués dans le même contexte que le jeu (accès à S, step, addEnt…)
const scenarios = `
const run = (sec, dt = OFF_DT) => { for (let i = 0; i < sec / dt; i++) step(dt); };
const fresh = (stage) => { newState(); S.stage = stage; S.area = { w:W, h:H }; S.ents = S.ents.filter((e) => e.kind === "crate"); invalidate(); };
const out = {};

// vapeur : chaudière avec du bois à côté d'un four à vapeur rempli de sable
fresh(4);
const boil = addEnt({ kind:"boiler", name:"boiler", stage:4, x:2, y:8, o:"e", fuel:30 });
const fur = addEnt({ kind:"machine", name:"steam_furnace", stage:4, x:5, y:8, o:"e" });
fur.inb.sable = 8;
run(60);
out.steam = { powered:powered.has("m" + fur.id), produced:Object.values(fur.outb).reduce((a, b) => a + b, 0) + (fur.inb.verre || 0) + (fur.craft ? 1 : 0), fuelUsed:30 - boil.fuel };
boil.fuel = 0; run(2);
out.steamOff = { stalled:!!fur.stalled || !powered.has("m" + fur.id) };

// électricité : générateur avec du bois, poteau, extracteur de sable qui pose sur un tapis en métal vers un coffre
fresh(5);
addEnt({ kind:"generator", name:"generator", stage:5, x:2, y:10, o:"e", fuel:30 });
addEnt({ kind:"pole", name:"pole", stage:5, x:6, y:10 });
const ex = addEnt({ kind:"extractor", name:"extractor_sable", stage:5, x:6, y:8, o:"e", gives:"sable", rate:1, acc:0, lane:0 });
for (const x of [7, 8, 9]) S.belts[x + ",8"] = { x, y:8, d:"E", k:"metal", lanes:[[], []], on:true };
const chest = addEnt({ kind:"chest", name:"chest_metal", stage:5, x:10, y:8, o:"e", store:{} });
run(30);
out.elec = { powered:elecPowered(ex), inChest:chest.store.sable || 0 };

// serre de l'usine : de base et en fleurs ; vide tant qu'on ne plante pas ; plantes à mi-pousse ; fleurs au bout de FLOWER_TIME
newState();
const bed = S.ents.find((e) => e.kind === "flowerbed");
out.bed = { start:bed && bedFrame(bed) };
bed.planted = false; bed.grown = 0; run(600); out.bed.empty = bedFrame(bed);
bed.planted = true; run(FLOWER_TIME / 2 + 10); out.bed.half = bedFrame(bed);
run(FLOWER_TIME); out.bed.ready = bedFrame(bed);

// rattrapage : 24 h d'une usine électrique complète (la démo)
demoState(); S.demo = false; catching = true; // comme pendant un vrai rattrapage
const t0 = Date.now(); const coins0 = S.coins;
run(24 * 3600);
catching = false;
out.offline = { ms:Date.now() - t0, earned:Math.round(S.coins - coins0) };
globalThis.__out = out;
`;
// le jeu est enfermé dans une fonction (« (() => { … })(); ») : les scénarios vont juste avant sa fermeture
const game = readFileSync(new URL("game.js", root), "utf8"), end = game.lastIndexOf("})();");
vm.runInContext(game.slice(0, end) + scenarios + game.slice(end), ctx);
const out = ctx.__out;
console.log(JSON.stringify(out, null, 1));

assert.ok(out.steam.powered, "la chaudière alimente le four à vapeur");
assert.ok(out.steam.produced > 0, "le four à vapeur fabrique");
assert.ok(out.steam.fuelUsed > 1 && out.steam.fuelUsed < 3, "la chaudière brûle environ 2 bois par minute pour une machine");
assert.ok(out.steamOff.stalled, "sans bois, le four s'arrête");
assert.ok(out.elec.powered, "l'extracteur est sur le réseau électrique");
assert.ok(out.elec.inChest >= 20, "l'extracteur remplit le coffre par le tapis en métal");
assert.deepEqual({ ...out.bed }, { start:3, empty:0, half:2, ready:3 }, "la serre : en fleurs au départ, vide sans plantation, puis plantes et fleurs");
assert.ok(out.offline.earned > 0, "l'usine gagne des pièces pendant l'absence");
console.log(`OK — 24 h d'absence calculées en ${out.offline.ms} ms`);
