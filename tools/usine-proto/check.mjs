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

// machine manuelle : les ingrédients de base restent dans le sac, elle les prend en lançant ; elle ne garde que la peinture
newState();
const pt = S.ents.find((e) => e.name === "paint_table");
S.bag = Array(BAG).fill(null); bagAdd("pigment_rouge", 3); bagAdd("boule_transparente", 2);
pt.queue = ["peinture_rouge", "boule_rouge"];
run(30);
out.manual = { pigmentsLeft:bagCount("pigment_rouge"), pigmentInside:pt.inb.pigment_rouge || 0, paintInside:pt.inb.peinture_rouge || 0,
  balls:Object.entries(pt.outb).filter(([k]) => k.startsWith("boule")).reduce((n, [, v]) => n + v, 0) };

// une fabrication demandée se termine toujours : même si le sac est vidé ensuite (ventes, coffre), les ingrédients sont réservés
newState();
const pt2 = S.ents.find((e) => e.name === "paint_table");
S.bag = Array(BAG).fill(null); bagAdd("pigment_rouge", 1); bagAdd("boule_transparente", 4);
pt2.resV = 1; pt2.queue = [];
for (const [id, n] of [["peinture_rouge", 1], ["boule_rouge", 4]]) { const r = recipeOf(pt2, id); const k = Math.min(n, possible(pt2, r)); reserve(pt2, r, k); for (let i = 0; i < k; i++) pt2.queue.push(id); }
const queued = pt2.queue.length;
S.bag = Array(BAG).fill(null); // tout le sac est vendu
run(120);
out.neverBlocked = { queued, left:pt2.queue.length, balls:Object.entries(pt2.outb).filter(([k]) => k.startsWith("boule")).reduce((n, [, v]) => n + v, 0) };

// retour après 1 h d'absence : le four fini les 5 boules demandées (rattrapage par catchUp, comme à l'ouverture)
newState();
const kiln = S.ents.find((e) => e.name === "kiln");
S.bag = Array(BAG).fill(null); bagAdd("sable", 10);
const rb = recipeOf(kiln, "boule"); kiln.resV = 1; kiln.queue = []; reserve(kiln, rb, 5); for (let i = 0; i < 5; i++) kiln.queue.push("boule");
S.savedAt = Date.now(); S.simAt = Date.now() - 3600e3; // sauvegardé à l'instant (arrière-plan) mais calculé il y a 1 h
catchUp();
globalThis.__away = new Promise((done) => { const wait = () => (catching ? setTimeout(wait, 20) : done({ balls:kiln.outb.boule_transparente || 0, queue:kiln.queue.length })); wait(); });

// sciure : les planches n'en font plus, et une vieille partie en est nettoyée (sac, coffre, machine, tapis)
newState();
const oldChest = S.ents.find((e) => e.kind === "chest");
S.bag = Array(BAG).fill(null); bagAdd("sciure", 7); bagAdd("sable", 3); oldChest.store = { sciure:12, bois:4 };
const oldKiln = S.ents.find((e) => e.name === "kiln"); oldKiln.outb = { sciure:2, boule_transparente:1 };
S.belts["5,7"] = { x:5, y:7, d:"E", k:"bois", lanes:[[{ it:"sciure", p:0.5 }, { it:"sable", p:0.1 }], []], on:true };
dropGone(S);
out.sciure = { planche:Object.keys(PLANCHE.out).join(","), bag:bagCount("sciure"), sable:bagCount("sable"), chest:JSON.stringify(oldChest.store),
  machine:JSON.stringify(oldKiln.outb), belt:S.belts["5,7"].lanes[0].map((o) => o.it).join(",") };

// manivelle : un toucher la remonte à fond ; elle tient 8 h ; tous les tapis en bois à portée tournent
fresh(3);
const crank = addEnt({ kind:"crank", name:"crank", stage:3, x:6, y:8 });
const kb = addEnt({ kind:"machine", name:"kiln_belt", stage:3, x:3, y:8, o:"e" });
for (let x = 2; x <= 10; x++) S.belts[x + ",11"] = { x, y:11, d:"E", k:"bois", lanes:[[], []], on:false };
crank.reserve = 0; S.player.x = 6; S.player.y = 10; S.player.px = 6; S.player.py = 10;
interact(crank, true);
const wound = crank.reserve;
kb.inb.sable = 6; run(7 * 3600);
computePower();
out.crank = { wound, poweredAfter7h:powered.has("m" + kb.id), belts:[...powered].filter((k) => k.startsWith("b")).length, machines:crank.machines };
run(3600 + 10); computePower();
out.crank.after8h = powered.has("m" + kb.id);

// peinture : demander 6 boules rouges suffit (la peinture est faite d'abord, 4 boules par pigment)
newState();
const tp = S.ents.find((e) => e.name === "paint_table");
S.bag = Array(BAG).fill(null); bagAdd("pigment_rouge", 2); bagAdd("boule_transparente", 6);
tp.resV = 1; tp.queue = [];
const rr = recipeOf(tp, "boule_rouge"), can6 = possible(tp, rr), plan = planFor(tp, rr, can6).map(([p, t]) => p.id + "×" + t).join(" ");
for (const [p, t] of planFor(tp, rr, can6)) { reserve(tp, p, t); for (let k = 0; k < t; k++) tp.queue.push(p.id); }
run(120);
out.paint = { possible:can6, plan, balls:tp.outb.boule_rouge || 0, queue:tp.queue.length, pigmentsLeft:bagCount("pigment_rouge") };

// peinture à tapis : pleine de boules mais sans peinture, elle prend encore par le tapis (pour laisser passer le pigment)
fresh(3);
const pb = addEnt({ kind:"machine", name:"paint_table_belt", stage:3, x:3, y:8, o:"e" });
pb.inb.boule_transparente = 8;
out.beltPaint = { byHand:accepts(pb, "boule_transparente"), byBelt:accepts(pb, "boule_transparente", true), pigment:accepts(pb, "pigment_rouge", true) };
pb.inb.boule_transparente = 24; out.beltPaint.capped = accepts(pb, "boule_transparente", true);

// poubelle : on la pose dès l'étape 1 ; un tapis qui y arrive s'y vide
fresh(1); S.coins = 100; // atelier vide (fresh ne garde que la caisse)
const placedT = place("poubelle", 0, 6, 9);
const bin = S.ents.find((e) => e.kind === "trash");
const toBin = S.belts["5,9"] = { x:5, y:9, d:"E", k:"fonte", lanes:[[], []], on:true };
const ate = deliver(toBin, 0, "sable") && deliver(toBin, 1, "pigment_rouge");
out.trash = { placed:placedT, cost:100 - S.coins, ate, eaten:bin.eaten, movable:MOVABLE.includes("trash") };

// démonter une machine rend ce qu'elle contenait
newState();
const dk = S.ents.find((e) => e.name === "kiln");
S.bag = Array(BAG).fill(null); dk.inb = { sable:3 }; dk.outb = { boule_transparente:2 }; dk.res = { sable:4 };
demolish(dk.x, dk.y);
out.demolish = { sable:bagCount("sable"), boules:bagCount("boule_transparente"), gone:!S.ents.includes(dk) };

// métier à tisser : le fil et les perles arrivent par deux côtés différents (avant : seule la case « entrée » prenait)
fresh(3);
const crank2 = addEnt({ kind:"crank", name:"crank", stage:3, x:5, y:11 }); crank2.reserve = CRANK_MAX;
const loom = addEnt({ kind:"machine", name:"loom", stage:3, x:5, y:9, o:"e" });             // cases (5,9) et (6,9) ; sortie à l'est
const west = S.belts["4,9"] = { x:4, y:9, d:"E", k:"bois", lanes:[[], []], on:true };     // arrive par l'entrée
const north = S.belts["6,8"] = { x:6, y:8, d:"S", k:"bois", lanes:[[], []], on:true };    // arrive par le haut
const outb = S.belts["7,9"] = { x:7, y:9, d:"E", k:"bois", lanes:[[], []], on:true };     // part de la sortie
const unl = unlinked(loom).join(",");
const fil1 = deliver(west, 0, "fil"), perle1 = deliver(north, 1, "perles");
outb.d = "W"; const viaSortie = deliver(outb, 0, "perles"); outb.d = "E";                 // un tapis sur la sortie, tourné vers la machine
loom.inb.perles = 12; computePower(); run(10);
out.loom = { unlinked:unl, fil:fil1, perles:perle1, viaSortie, guirlandes:(loom.outb.guirlande || 0) + outb.lanes[0].filter((o) => o.it === "guirlande").length };

// démonter un bâtiment se confirme (deux touchers) ; un tapis part d'un coup
newState();
const dk2 = S.ents.find((e) => e.name === "kiln");
askDemolish(dk2); const afterOne = S.ents.includes(dk2);
askDemolish(dk2); const afterTwo = S.ents.includes(dk2);
S.belts["3,9"] = { x:3, y:9, d:"E", k:"bois", lanes:[[], []], on:true }; demolish(3, 9);
out.confirm = { afterOne, afterTwo, belt:!!S.belts["3,9"] };

// carrière : un tas de plus, posé où l'on veut, avec sa goulotte ; il verse sur le tapis qui part de lui
fresh(3); S.coins = 10000;
const placedQ = place("quarry", 0, 3, 12);
const quarry = S.ents.find((e) => e.quarry);
S.belts["4,12"] = { x:4, y:12, d:"E", k:"bois", lanes:[[], []], on:true };
const cq = addEnt({ kind:"crank", name:"crank", stage:3, x:5, y:14 }); cq.reserve = CRANK_MAX; computePower();
run(30);
const onBelt = S.belts["4,12"].lanes.flat().filter((o) => o.it === "sable").length;
quarry.gives = "bois"; quarry.name = "source_bois"; quarry.stock = 0;
const coinsBefore = S.coins; askDemolish(quarry); askDemolish(quarry);
out.quarry = { placed:placedQ, cost:10000 - coinsBefore, chute:quarry.chute, sandOnBelt:onBelt > 0, gone:!S.ents.includes(quarry), refund:S.coins - coinsBefore };

// aiguilleur : avec un filtre, l'objet choisi va tout droit et le reste sur les côtés ; sans filtre, chacun son tour
fresh(3); S.coins = 1000;
place("aiguilleur", 0, 5, 9);
const sw = S.ents.find((e) => e.kind === "switch");
const inB = S.belts["4,9"] = { x:4, y:9, d:"E", k:"bois", lanes:[[], []], on:true };
const fwd = S.belts["6,9"] = { x:6, y:9, d:"E", k:"bois", lanes:[[], []], on:true };
const up = S.belts["5,8"] = { x:5, y:8, d:"N", k:"bois", lanes:[[], []], on:true };
const down = S.belts["5,10"] = { x:5, y:10, d:"S", k:"bois", lanes:[[], []], on:true };
const clear = () => [fwd, up, down].forEach((b) => (b.lanes = [[], []]));
const where = () => [fwd, up, down].map((b) => b.lanes.flat().map((o) => o.it).join("+") || "-").join(" | ");
sw.filter = "sable"; deliver(inB, 0, "sable"); deliver(inB, 1, "bois"); const filtered = where();
clear(); sw.filter = null; for (const l of [0, 1, 0]) { clear2: { deliver(inB, l, "verre"); } [fwd, up, down].forEach((b) => b.lanes.forEach((L) => L.forEach((o) => (o.p = 0.9)))); }
const shared = [fwd, up, down].map((b) => b.lanes.flat().length).join(",");
// une machine dont la sortie touche un aiguilleur lui passe ce qu'elle fait
fresh(3); S.coins = 1000;
const kq = addEnt({ kind:"machine", name:"kiln_belt", stage:3, x:3, y:9, o:"e" });            // sortie à l'est, en (5,9)
place("aiguilleur", 0, 5, 9);
const fwd2 = S.belts["6,9"] = { x:6, y:9, d:"E", k:"bois", lanes:[[], []], on:true };
kq.outb = { boule_transparente:1 };
updateMachine(kq, 0.1);
out.switch = { filtered, shared, fromMachine:fwd2.lanes.flat().map((o) => o.it).join(","), unlinked:unlinked(kq).join(",") };

// une seule recette : les vieilles machines en « automatique » prennent la leur ; une famille de couleurs suit les intermédiaires
fresh(3);
const sp = addEnt({ kind:"machine", name:"star_press", stage:3, x:3, y:9, o:"e" }); sp.recipe = "auto";
const lm = addEnt({ kind:"machine", name:"loom", stage:3, x:3, y:12, o:"e" }); lm.recipe = "auto";
dropGone(S);
out.recipe = { press:sp.recipe, loom:lm.recipe, pressList:activeRecipes(sp).map((r) => r.id).join(","),
  choices:recipeChoices("paint_table_belt").map((c) => c.id).slice(0, 3).join(","), kiln:defaultRecipe("kiln_belt") };

// visites guidées des étapes : chaque mission se calcule sans erreur, de l'usine vide à l'usine complète
out.tours = {};
for (const st of [2, 3, 4, 5]) {
  fresh(st); computePower();
  out.tours[st] = STAGE_TOURS[st].map((x) => (x.need ? (x.need() ? "✓" : "○") : "·")).join("");
}

// étape 3 faite : goulotte, four à tapis relié au tas et à la sortie, manivelle remontée -> toutes les missions cochées
fresh(3);
addEnt({ kind:"source", name:"source_sable", gives:"sable", stage:1, x:2, y:9, stock:20, chute:true, acc:0, lane:0 }); // fresh() ne garde que la caisse
const kb3 = addEnt({ kind:"machine", name:"kiln_belt", stage:3, x:5, y:9, o:"e" });
S.belts["4,9"] = { x:4, y:9, d:"E", k:"bois", lanes:[[], []], on:true };
S.belts["7,9"] = { x:7, y:9, d:"E", k:"bois", lanes:[[], []], on:true };
const c3 = addEnt({ kind:"crank", name:"crank", stage:3, x:5, y:11 }); c3.reserve = CRANK_MAX; computePower();
out.tour3done = STAGE_TOURS[3].map((x) => (x.need ? (x.need() ? "✓" : "○") : "·")).join("");

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
out.away = { ...(await ctx.__away) };
console.log(JSON.stringify(out, null, 1));

assert.ok(out.steam.powered, "la chaudière alimente le four à vapeur");
assert.ok(out.steam.produced > 0, "le four à vapeur fabrique");
assert.ok(out.steam.fuelUsed > 1 && out.steam.fuelUsed < 3, "la chaudière brûle environ 2 bois par minute pour une machine");
assert.ok(out.steamOff.stalled, "sans bois, le four s'arrête");
assert.ok(out.elec.powered, "l'extracteur est sur le réseau électrique");
assert.ok(out.elec.inChest >= 20, "l'extracteur remplit le coffre par le tapis en métal");
assert.deepEqual({ ...out.bed }, { start:3, empty:0, half:2, ready:3 }, "la serre : en fleurs au départ, vide sans plantation, puis plantes et fleurs");
assert.deepEqual({ ...out.manual }, { pigmentsLeft:2, pigmentInside:0, paintInside:3, balls:1 }, "table de peinture : 1 pigment pris, aucun stocké, 3 peintures gardées, 1 boule");
assert.deepEqual({ ...out.neverBlocked }, { queued:5, left:0, balls:4 }, "une file demandée se termine toujours, même sac vidé");
assert.deepEqual(out.away, { balls:5, queue:0 }, "au retour (1 h), les 5 boules demandées sont faites, même si la dernière sauvegarde est récente");
assert.ok(out.offline.earned > 0, "l'usine gagne des pièces pendant l'absence");
assert.deepEqual({ ...out.sciure }, { planche:"planche", bag:0, sable:3, chest:'{"bois":4}', machine:'{"boule_transparente":1}', belt:"sable" }, "plus de sciure : ni fabriquée, ni dans les vieilles parties");
assert.equal(out.crank.wound, 8 * 3600, "un toucher remonte la manivelle à fond (8 h)");
assert.ok(out.crank.poweredAfter7h, "la manivelle fait encore tourner la machine au bout de 7 h");
assert.equal(out.crank.belts, 9, "tous les tapis en bois à portée tournent (plus de limite à 8)");
assert.ok(!out.crank.after8h, "au bout de 8 h, la manivelle est à l'arrêt");
assert.deepEqual({ ...out.paint }, { possible:6, plan:"peinture_rouge×2 boule_rouge×6", balls:6, queue:0, pigmentsLeft:0 }, "6 boules rouges demandées d'un coup : 2 peintures faites d'abord, puis les 6 boules");
assert.deepEqual({ ...out.beltPaint }, { byHand:false, byBelt:true, pigment:true, capped:false }, "peinture à tapis : la voie ne se bloque plus derrière des boules sans peinture");
assert.deepEqual({ ...out.demolish }, { sable:7, boules:2, gone:true }, "démonter une machine rend son contenu");
assert.deepEqual({ ...out.trash }, { placed:true, cost:20, ate:true, eaten:2, movable:true }, "poubelle : posée pour 20 p, elle avale ce que les tapis lui amènent");
assert.deepEqual({ ...out.loom }, { unlinked:"", fil:true, perles:true, viaSortie:false, guirlandes:1 }, "métier à tisser : fil par l'entrée, perles par le haut, une guirlande ; rien n'entre par la sortie");
assert.deepEqual({ ...out.confirm }, { afterOne:true, afterTwo:false, belt:false }, "démonter un bâtiment demande un second toucher ; un tapis part d'un coup");
assert.deepEqual({ ...out.quarry }, { placed:true, cost:2500, chute:true, sandOnBelt:true, gone:true, refund:1250 }, "carrière : posée, elle verse du sable sur son tapis, se démonte (moitié rendue)");
assert.deepEqual({ ...out.switch }, { filtered:"sable | - | bois", shared:"1,1,1", fromMachine:"boule_transparente", unlinked:"entrée" }, "aiguilleur : filtre tout droit / côtés, partage égal, et prend la sortie d'une machine");
assert.deepEqual({ ...out.recipe }, { press:"fam:finie", loom:"guirlande", pressList:"finie_rouge,finie_vert,finie_or,finie_bleu,crochet", choices:"fam:boule,fam:peinture,etoile_doree", kiln:"soufflage" }, "une seule recette par machine automatique");

assert.equal(out.tour3done, "·✓✓✓✓✓····", "étape 3 faite : toutes ses missions sont cochées");
for (const st of [2, 3, 4, 5]) assert.ok(!out.tours[st].includes("✓"), `étape ${st} : une usine vide n'a encore fait aucune mission (${out.tours[st]})`);
console.log(`OK — 24 h d'absence calculées en ${out.offline.ms} ms`);
