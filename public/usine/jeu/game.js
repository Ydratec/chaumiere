// Usine de Noël — prototype v2 (étapes 1 à 3), sur le gameplay validé :
// tout à la main au début (tas de matières, sac, four et table), marché pour acheter, puis tapis à deux voies sans bras.
// Logique (état, recettes, tapis) séparée du rendu (canvas) et de l'interface (DOM), pour être portée en TypeScript dans Chaumière.
(() => {
"use strict";
const META = window.USINE_META;
const T = 32, W = 24, H = 18, Y0 = 2; // W × H : taille maximale de l'atelier ; Y0 : rangées du mur du fond
// L'atelier commence petit et s'agrandit (page Construire) : S.area = { w, h } est la partie utilisable de la carte.
const AREA0 = { w:9, h:8 }; // 9 × 6 cases de sol : juste la place des tas, de la caisse, du coffre et des deux premières machines
const EXPAND = [[10, 9, 150], [12, 9, 400], [12, 11, 900], [14, 11, 2000], [16, 13, 4000], [18, 14, 7000], [20, 16, 11000], [22, 17, 15000], [W, H, 20000]]; // [largeur, hauteur, prix]
const nextExpand = () => EXPAND.find(([w, h]) => w > S.area.w || h > S.area.h);
// La salle vient de l'onglet Usine (?room=…) : la partie est gardée sur le serveur (/api/usine/<salle>) et sur l'appareil.
const ROOM = new URLSearchParams(location.search).get("room");
const SAVE_KEY = ROOM ? "usine-v2:" + ROOM : "usine-proto-v2";
const API = ROOM ? `/api/usine/${ROOM}` : null;
const OFFLINE_MAX = 24 * 3600, OFF_DT = 1; // l'usine tourne pendant l'absence, 24 h au plus ; pas de calcul (s)

// ---------------------------------------------------------------- données
const COLORS = ["rouge", "vert", "or", "bleu"];
const BOULE = { rouge:"boule_rouge", vert:"boule_verte", or:"boule_or", bleu:"boule_bleue" };
const ITEMS = ["sable","bois","branche","fil","sapin_brut","pigment_rouge","pigment_vert","pigment_or","pigment_bleu",
  "verre_fondu","verre","perles","eclats","planche","sciure","crochet","peinture_rouge","peinture_vert","peinture_or","peinture_bleu",
  "boule_transparente","boule_rouge","boule_verte","boule_or","boule_bleue","boule_finie_rouge","boule_finie_vert","boule_finie_or","boule_finie_bleu",
  "etoile_bois","etoile_doree","ruban","guirlande","couronne","sapin_decore","cadeau","piece"];
const NAMES = { sable:"Sable", bois:"Bois", branche:"Branches", fil:"Fil", sapin_brut:"Sapin brut", verre:"Verre", perles:"Perles",
  eclats:"Éclats", planche:"Planche", sciure:"Sciure", crochet:"Crochet", boule_transparente:"Boule transparente",
  etoile_bois:"Étoile en bois", etoile_doree:"Étoile dorée", ruban:"Ruban", guirlande:"Guirlande", couronne:"Couronne", sapin_decore:"Sapin décoré" };
const CNAME = { rouge:"rouge", vert:"verte", or:"or", bleu:"bleue", verte:"verte", bleue:"bleue" };
function label(it) {
  if (it.startsWith("@")) return { boule_peinte:"Boule peinte", boule_finie:"Boule finie", peinture:"Peinture" }[it.slice(1)] || it;
  if (NAMES[it]) return NAMES[it];
  let m;
  if ((m = it.match(/^pigment_(\w+)$/))) return "Pigment " + m[1];
  if ((m = it.match(/^peinture_(\w+)$/))) return "Peinture " + m[1];
  if ((m = it.match(/^boule_finie_(\w+)$/))) return "Boule finie " + CNAME[m[1]];
  if ((m = it.match(/^boule_(\w+)$/))) return "Boule " + CNAME[m[1]];
  return it;
}
function cat(it) {
  if (it.startsWith("boule_finie_")) return "boule_finie";
  if (/^boule_(rouge|verte|or|bleue)$/.test(it)) return "boule_peinte";
  if (it.startsWith("peinture_")) return "peinture";
  if (it.startsWith("pigment_")) return "pigment";
  return it;
}
const iconOf = (k) => k.startsWith("@") ? ({ boule_peinte:"boule_rouge", boule_finie:"boule_finie_rouge", peinture:"peinture_rouge" }[k.slice(1)]) : k;
const matches = (it, key) => key.startsWith("@") ? cat(it) === key.slice(1) : it === key;
const PRICE = { boule_transparente:1, boule_peinte:3, etoile_bois:2, boule_finie:5, etoile_doree:3, guirlande:7, couronne:15, sapin_decore:56, ruban:2 };
const price = (it) => PRICE[it] ?? PRICE[cat(it)] ?? 0;
// tas de matières premières : capacité gratuite, recharge par seconde, prix au marché
const RAW = {
  sable:{ cap:20, refill:1, cost:0.5, stage:1 }, branche:{ cap:20, refill:0.5, cost:0.5, stage:1 },
  pigment_rouge:{ cap:20, refill:0.5, cost:1, stage:1 }, pigment_vert:{ cap:20, refill:0.5, cost:1, stage:1 },
  pigment_or:{ cap:20, refill:0.5, cost:1, stage:1 }, pigment_bleu:{ cap:20, refill:0.5, cost:1, stage:1 },
  bois:{ cap:20, refill:0.5, cost:1, stage:2 }, fil:{ cap:20, refill:0.5, cost:1, stage:2 }, sapin_brut:{ cap:10, refill:0.1, cost:8, stage:2 },
};
const RAW_X = { sable:0, branche:1, pigment_rouge:3, pigment_vert:4, pigment_or:5, pigment_bleu:6, bois:11, fil:13, sapin_brut:15 };
const SRC_FILE = { sapin_brut:"source_sapin" };
const MARKET_MAX = 200, HARVEST_PER_S = 2, CHUTE_COST = 300, CHUTE_RATE = 2;

const paint = (c) => [
  { id:"boule_" + c, name:"Boule " + CNAME[c], in:{ boule_transparente:1, ["peinture_" + c]:1 }, out:{ [BOULE[c]]:1 }, t:2, color:c },
  { id:"peinture_" + c, name:"Peinture " + c, in:{ ["pigment_" + c]:1 }, out:{ ["peinture_" + c]:4 }, t:1, color:c },
];
const PLANCHE = { id:"planche", name:"Planches", in:{ bois:2 }, out:{ planche:2, sciure:1 }, t:2 };
const ETOILE = { id:"etoile_bois", name:"Étoile en bois", in:{ planche:1 }, out:{ etoile_bois:1 }, t:1.5 };
const BOULE_ART = { id:"boule", name:"Boule transparente", in:{ sable:2 }, out:{ boule_transparente:1 }, t:8 };
const RECIPES = {
  kiln:[BOULE_ART], kiln_bellows:[BOULE_ART],
  paint_table:COLORS.flatMap(paint),
  wreath_table:[{ id:"couronne", name:"Couronne de branches", in:{ branche:4, "@boule_peinte":2 }, out:{ couronne:1 }, t:4 }],
  lathe:[ETOILE, PLANCHE],
  tree_bench:[{ id:"sapin", name:"Sapin décoré", in:{ sapin_brut:1, "@boule_peinte":4, etoile_bois:1 }, out:{ sapin_decore:1 }, t:6 }],
  kiln_belt:[{ id:"soufflage", name:"Soufflage", in:{ verre:1 }, out:{ boule_transparente:1 }, t:2 },
    { id:"verre", name:"Verre", in:{ sable:2 }, out:{ verre:1 }, t:3 }, { id:"perles", name:"Perles", in:{ verre:1 }, out:{ perles:8 }, t:2, manual:true }],
  paint_table_belt:[{ id:"etoile_doree", name:"Étoile dorée", in:{ etoile_bois:1, peinture_or:2 }, out:{ etoile_doree:1 }, t:2, manual:true }, ...COLORS.flatMap(paint)],
  star_press:[...COLORS.map((c) => ({ id:"finie_" + c, name:"Boule finie " + CNAME[c], in:{ [BOULE[c]]:1, crochet:1 }, out:{ ["boule_finie_" + c]:1 }, t:1, color:c })),
    { id:"crochet", name:"Crochets", in:{ fil:1 }, out:{ crochet:4 }, t:0.5 }, { ...ETOILE, manual:true }, { ...PLANCHE, manual:true }],
  loom:[{ id:"guirlande", name:"Guirlande", in:{ fil:1, perles:12 }, out:{ guirlande:1 }, t:3 }, { id:"ruban", name:"Ruban", in:{ fil:2, "@peinture":1 }, out:{ ruban:2 }, t:1 }],
  wreath_table_belt:[{ id:"couronne", name:"Couronne", in:{ branche:4, ruban:1, "@boule_finie":2 }, out:{ couronne:1 }, t:4 }],
};
RECIPES.elec_furnace = RECIPES.kiln_belt; RECIPES.paint_booth = RECIPES.paint_table_belt; RECIPES.assembler = RECIPES.star_press;
RECIPES.elec_loom = RECIPES.loom; RECIPES.elec_wreath = RECIPES.wreath_table_belt;
// étape 4 : les machines à vapeur font comme leurs équivalentes à tapis, plus vite (vitesse de l'étape)
RECIPES.steam_furnace = RECIPES.kiln_belt; RECIPES.steam_sprayer = RECIPES.paint_table_belt; RECIPES.steam_press = RECIPES.star_press;
RECIPES.steam_loom = RECIPES.loom; RECIPES.steam_wreath = RECIPES.wreath_table_belt; RECIPES.steam_tree = RECIPES.tree_bench;
RECIPES.tree_decorator = [{ id:"sapin", name:"Sapin décoré", in:{ sapin_brut:1, "@boule_finie":6, guirlande:1, etoile_doree:1 }, out:{ sapin_decore:1 }, t:6 }];
const MACH = {
  kiln:{ stage:1, name:"Four à boules" }, paint_table:{ stage:1, name:"Table de peinture" }, wreath_table:{ stage:1, name:"Table à couronnes" },
  kiln_bellows:{ stage:2, name:"Four à soufflet" }, lathe:{ stage:2, name:"Tour à bois" }, tree_bench:{ stage:2, name:"Établi à sapins" },
  kiln_belt:{ stage:3, name:"Four à tapis", power:true }, paint_table_belt:{ stage:3, name:"Peinture à tapis", power:true },
  star_press:{ stage:3, name:"Presse à manivelle", power:true }, loom:{ stage:3, name:"Métier à tisser", power:true },
  wreath_table_belt:{ stage:3, name:"Couronnes à tapis", power:true },
  steam_furnace:{ stage:4, name:"Four à vapeur", power:"steam" }, steam_sprayer:{ stage:4, name:"Peinture à vapeur", power:"steam" },
  steam_press:{ stage:4, name:"Presse à vapeur", power:"steam" }, steam_loom:{ stage:4, name:"Métier à vapeur", power:"steam" },
  steam_wreath:{ stage:4, name:"Couronnes à vapeur", power:"steam" }, steam_tree:{ stage:4, name:"Établi à vapeur", power:"steam" },
  elec_furnace:{ stage:5, name:"Four à induction", power:"elec" }, paint_booth:{ stage:5, name:"Cabine de peinture", power:"elec" },
  assembler:{ stage:5, name:"Assembleur", power:"elec" }, elec_loom:{ stage:5, name:"Métier électrique", power:"elec" },
  elec_wreath:{ stage:5, name:"Machine à couronnes", power:"elec" }, tree_decorator:{ stage:5, name:"Décoratrice électrique", power:"elec" },
};
const SPEED = { 1:0.5, 2:0.75, 3:1, 4:1.5, 5:2 };
// Améliorations : une machine se remplace sur place par la suivante de sa famille (même rôle, plus rapide, à tapis…).
// On n'achète que la première machine de chaque famille ; les suivantes s'obtiennent en améliorant.
const UPGRADE = {
  kiln:"kiln_bellows", kiln_bellows:"kiln_belt", kiln_belt:"steam_furnace", steam_furnace:"elec_furnace",
  paint_table:"paint_table_belt", paint_table_belt:"steam_sprayer", steam_sprayer:"paint_booth",
  wreath_table:"wreath_table_belt", wreath_table_belt:"steam_wreath", steam_wreath:"elec_wreath",
  lathe:"star_press", star_press:"steam_press", steam_press:"assembler",
  tree_bench:"steam_tree", steam_tree:"tree_decorator", loom:"steam_loom", steam_loom:"elec_loom",
};
const UPGRADED = new Set(Object.values(UPGRADE));
const BUILD = {   // [clé, coût, nom affiché si ce n'est pas une machine]
  1:[["kiln", 180], ["paint_table", 180], ["chest_wood", 60, "Coffre"], ["serre_fleurs", 300, "Serre de l'usine"]],
  2:[["wreath_table", 400], ["lathe", 830], ["tree_bench", 830], ["kiln_bellows", 830]],
  3:[["belt", 5, "Tapis en bois"], ["crank", 400, "Manivelle"], ["kiln_belt", 4700], ["paint_table_belt", 4700], ["star_press", 4700], ["loom", 4700], ["wreath_table_belt", 4700]],
  4:[["belt_fonte", 20, "Tapis en fonte"], ["boiler", 1200, "Chaudière"], ...["steam_furnace", "steam_sprayer", "steam_press", "steam_loom", "steam_wreath", "steam_tree"].map((k) => [k, 11350])],
  5:[["belt_metal", 60, "Tapis en métal"], ["generator", 8000, "Générateur"], ["pole", 400, "Poteau électrique"], ["extractor_sable", 3000, "Extracteur"],
    ["chest_metal", 500, "Coffre en métal"], ...["elec_furnace", "paint_booth", "assembler", "elec_loom", "elec_wreath", "tree_decorator"].map((k) => [k, 23240])],
};
const BELT_COST = { bois:5, fonte:20, metal:60 };
// Serre de l'usine (dessin : tools/usine-pixel/serre.py) : on plante, ça pousse en FLOWER_TIME (même hors ligne), on récolte ;
// la récolte (3 fleurs, tirées par le serveur) va dans l'inventaire de la salle. Images : 0 vide, 1 pousses, 2 plantes, 3 fleurs.
const FLOWER_TIME = 2 * 3600, MAX_BEDS = 10; // le serveur n'accepte que 10 serres (numéros 0 à 9)
const STAGE_OF = { crank:3, belt_fonte:4, boiler:4, belt_metal:5, generator:5, pole:5, chest_metal:5 };
// Énergie (balance.json) : une chaudière fait 6 u/s de vapeur, une machine à vapeur en prend 2 → 3 machines ; 1 bois = 60 u de vapeur.
// Un générateur fait 900 kW avec 10 u/s de vapeur, une machine électrique (ou un extracteur) prend 150 kW → 6 appareils.
// ponytail: pas de tuyaux, la vapeur porte à BOILER_R cases (comme la manivelle) ; à remplacer par des réseaux de tuyaux si besoin.
const BOILER_R = 4, BOILER_N = 3, GEN_N = 6, FUEL_CAP = 30, BOIS_STEAM = 60;
const FUEL_RATE = { boiler:2 / BOIS_STEAM, generator:10 / BOIS_STEAM / GEN_N }; // bois/s par appareil alimenté
const GATES = { 2:{ coins:50 }, 3:{ coins:20610, rate:{ key:"@boule_peinte", per_min:1 } },
  4:{ coins:125760, rate:{ key:"@boule_finie", per_min:6 } }, 5:{ coins:149410, rate:{ key:"@boule_finie", per_min:60 } } };
const RATE_LABEL = { "@boule_peinte":"Boules peintes vendues", "@boule_finie":"Boules finies vendues" };
const STAGE_NAMES = { 1:"Atelier du lutin", 2:"Atelier équipé", 3:"Petite fabrique", 4:"Manufacture à vapeur", 5:"Usine électrique" };
const TILESET = { 1:["floor_wood", "wall_log"], 2:["floor_wood", "wall_log"], 3:["floor_wood", "wall_log"], 4:["floor_stone", "wall_brick"], 5:["floor_concrete", "wall_metal"] };
const BELT_SPEED = { bois:0.5, fonte:1, metal:2 };      // cases/s : 1, 2 et 4 objets/s par voie
const POLE_R = 4;
const UNLOCK_TEXT = { 2:"Bois, fil et sapins ; table à couronnes, tour à bois, établi à sapins, four à soufflet.",
  3:"Tapis à deux voies, goulottes sur les tas, manivelles et machines à tapis.",
  4:"Chaudières (au bois) et machines à vapeur : elles tournent même quand tu n'es pas là. Tapis en fonte, deux fois plus rapides.",
  5:"Générateur, poteaux et extracteurs : l'usine s'alimente toute seule. Machines électriques et tapis en métal." };
const DIRS = { E:[1,0], S:[0,1], W:[-1,0], N:[0,-1] };
const LEFT = { E:"N", S:"E", W:"S", N:"W" };          // côté gauche du sens de marche
const ROT = ["e", "s", "w", "n"], BROT = ["E", "S", "W", "N"];
const OPP = { E:"W", W:"E", N:"S", S:"N" };
const BELT_ROWS = ["E","W","S","N","W>S","S>W","E>S","S>E","W>N","N>W","E>N","N>E"];
const BAG = 8, STACK = 20, OUT_CAP = 12, RANGE = 3;
const BELT_V = 0.5, GAP = 0.5;                         // 1 objet/s par voie, 2 objets/s par tapis
const CRANK_MAX = 60, CRANK_WIND = 10, CRANK_R = 4;
const SPECIES = ["cat","dog","bunny","duck","turtle","fish","fox","frog","penguin","unicorn","dragon","shark","whale","schrodinger"];
const SPECIES_FR = { cat:"Chat", dog:"Chien", bunny:"Lapin", duck:"Canard", turtle:"Tortue", fish:"Poisson", fox:"Renard", frog:"Grenouille",
  penguin:"Pingouin", unicorn:"Licorne", dragon:"Dragon", shark:"Requin", whale:"Baleine", schrodinger:"Schrödinger" };
const COLORABLE = ["cat","dog","bunny","duck","turtle","fish"];
const ICONS = ["piece","etoile","main","marteau","loupe","poubelle","tourner","plus","moins","sac","marche","horloge","eclair",
  "cadenas","ok","non","reglages","commandes","progression","accelerer","tapis","info","maison"];

// ---------------------------------------------------------------- état
let S;
const rnd = Math.random;
function newState() {
  S = { v:2, time:0, stage:1, coins:60, earned:0, stars:0, ids:1, ents:[], belts:{}, bag:Array(BAG).fill(null),
    player:{ x:4, y:6, px:4, py:6, path:[], dir:"up", work:0, job:null },
    contracts:[], sales:[], stats:{}, test:false, avatar:{ species:"cat", color:0, santa:true }, area:{ ...AREA0 } };
  addEnt({ kind:"crate", name:"ship_crate", stage:1, x:8, y:4 });
  addEnt({ kind:"chest", name:"chest_wood", stage:1, x:8, y:5, o:"e", store:{} });
  addEnt({ kind:"flowerbed", name:"serre_fleurs", stage:1, x:7, y:2, planted:true, grown:FLOWER_TIME }); // la serre de l'usine, de base, en fleurs
  addEnt({ kind:"rug", name:"deco_rug", stage:1, x:3, y:6 });
  addSources(1);
  addEnt({ kind:"machine", name:"kiln", stage:1, x:0, y:4, o:"e" });
  addEnt({ kind:"machine", name:"paint_table", stage:1, x:4, y:4, o:"e" });
  for (let i = 0; i < 3; i++) newContract();
}
function addSources(stage) {
  for (const raw in RAW) if (RAW[raw].stage === stage)
  {
    const name = SRC_FILE[raw] || "source_" + raw;
    let at = fits(name, stage, undefined, RAW_X[raw], Y0) ? [RAW_X[raw], Y0] : null;
    for (let y = Y0; y < S.area.h && !at; y++) for (let x = 0; x < S.area.w && !at; x++) if (fits(name, stage, undefined, x, y)) at = [x, y];
    if (!at) at = [RAW_X[raw], Y0]; // atelier plein : à sa place d'origine (à déplacer après avoir agrandi)
    addEnt({ kind:"source", name, gives:raw, stage, x:at[0], y:at[1], stock:RAW[raw].cap, chute:false, acc:0, lane:0 });
  }
}
function addEnt(e) {
  e.id = S.ids++;
  if (e.kind === "machine") Object.assign(e, { inb:{}, outb:{}, craft:null, boost:0, recipe:e.recipe || "auto", color:e.color || null, lane:0, queue:[] });
  if (e.kind === "crank") e.reserve = CRANK_MAX / 2;
  S.ents.push(e); invalidate(); return e;
}
const byId = (id) => S.ents.find((e) => e.id === id);

// ---------------------------------------------------------------- sac
const bagCount = (it) => S.bag.reduce((n, s) => n + (s && s.it === it ? s.n : 0), 0);
function bagRoom(it) { return S.bag.reduce((n, s) => n + (!s ? STACK : s.it === it ? STACK - s.n : 0), 0); }
function bagAdd(it, n) {
  let left = n;
  for (const s of S.bag) if (s && s.it === it && left) { const k = Math.min(left, STACK - s.n); s.n += k; left -= k; }
  for (let i = 0; i < BAG && left; i++) if (!S.bag[i]) { const k = Math.min(left, STACK); S.bag[i] = { it, n:k }; left -= k; }
  return n - left;
}
function bagTake(it, n) {
  let left = n;
  for (let i = BAG - 1; i >= 0 && left; i--) { const s = S.bag[i]; if (s && s.it === it) { const k = Math.min(left, s.n); s.n -= k; left -= k; if (!s.n) S.bag[i] = null; } }
  return n - left;
}

// ---------------------------------------------------------------- géométrie
function sprOf(name, stage, o) { const ob = META[stage].objects[name]; return o ? ob[o] : ob; }
const spr = (e) => sprOf(e.name, e.stage, e.o);
function fp(e) { const f = spr(e).footprint || [1, 1]; return { w:f[0], h:f[1] }; }
function tilesOf(e) { const f = fp(e), out = []; for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) out.push([e.x + i, e.y + j]); return out; }
let occ = null;
function invalidate() { occ = null; }
function occupancy() {
  if (occ) return occ;
  occ = new Map();
  for (const e of S.ents) if (e.kind !== "rug") for (const [x, y] of tilesOf(e)) occ.set(x + "," + y, e);
  return occ;
}
const inFloor = (x, y) => x >= 0 && x < S.area.w && y >= Y0 && y < S.area.h;
const walkable = (x, y) => inFloor(x, y) && !occupancy().has(x + "," + y);
const entAt = (x, y) => occupancy().get(x + "," + y) || null;
function distTo(e, x, y) { let d = 1e9; for (const [tx, ty] of tilesOf(e)) d = Math.min(d, Math.max(Math.abs(tx - x), Math.abs(ty - y))); return d; }
function portsOf(e) {
  const p = spr(e).ports; if (!p) return null;
  const res = {};
  for (const k of ["in", "in2", "out"]) {
    if (!p[k]) continue;
    const t = p[k], [dx, dy] = DIRS[t.side];
    res[k] = { inside:[e.x + t.tile[0], e.y + t.tile[1]], outside:[e.x + t.tile[0] + dx, e.y + t.tile[1] + dy], side:t.side };
  }
  return res;
}
/** Ports d'une machine à tapis qui ne sont reliés à rien : il faut un tapis qui arrive sur chaque entrée et un qui part de la sortie. */
function unlinked(e) {
  const pt = e.kind === "machine" && portsOf(e); if (!pt) return [];
  const linked = (port, inward) => { const b = S.belts[port.outside[0] + "," + port.outside[1]]; return !!b && (inward ? b.d === OPP[port.side] : b.d !== OPP[port.side]); };
  const out = [];
  if (pt.in && !linked(pt.in, true)) out.push(pt.in2 ? "entrée 1" : "entrée");
  if (pt.in2 && !linked(pt.in2, true)) out.push("entrée 2");
  if (pt.out && !linked(pt.out, false)) out.push("sortie");
  return out;
}
function bfs(sx, sy, isGoal) {
  const start = sx + "," + sy;
  if (isGoal(sx, sy)) return [];
  const prev = new Map([[start, null]]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = x + dx, ny = y + dy, k = nx + "," + ny;
      if (prev.has(k) || !walkable(nx, ny)) continue;
      prev.set(k, x + "," + y);
      if (isGoal(nx, ny)) { const path = []; let c = k; while (c !== start) { path.unshift(c.split(",").map(Number)); c = prev.get(c); } return path; }
      q.push([nx, ny]);
    }
  }
  return null;
}
const inRange = (e) => distTo(e, S.player.x, S.player.y) <= RANGE;

// ---------------------------------------------------------------- machines
// La liste ne dépend que de la machine, de la recette choisie et de la couleur : on la calcule une fois (appelée très souvent).
const recipeMemo = new Map();
function activeRecipes(m) {
  const k = m.name + "|" + m.recipe + "|" + m.color;
  if (!recipeMemo.has(k)) recipeMemo.set(k, computeRecipes(m));
  return recipeMemo.get(k);
}
function computeRecipes(m) {
  const all = RECIPES[m.name];
  let list;
  if (m.recipe === "auto") list = all.filter((r) => !r.manual);
  else {
    const main = all.find((r) => r.id === m.recipe) || all[0];
    list = [main];
    for (let d = 0; d < 2; d++)
      for (const r of all) if (!list.includes(r) && list.some((l) => Object.keys(l.in).some((k) => Object.keys(r.out).some((o) => matches(o, k))))) list.push(r);
  }
  if (m.color) list = [...list].sort((a, b) => (b.color === m.color) - (a.color === m.color));
  return list;
}
function count(m, key) {
  if (!key.startsWith("@")) return m.inb[key] || 0;
  let n = 0; for (const it in m.inb) if (matches(it, key)) n += m.inb[it]; return n;
}
function capFor(m, key) { let need = 1; for (const r of activeRecipes(m)) if (r.in[key]) need = Math.max(need, r.in[key]); return Math.max(8, need * 3); }
function inputKey(m, it) {
  for (const r of activeRecipes(m)) for (const k in r.in) if (matches(it, k) && count(m, k) < capFor(m, k)) return k;
  return null;
}
const accepts = (m, it) => m.kind === "machine" && inputKey(m, it) !== null;
const usesItem = (m, it) => activeRecipes(m).some((r) => Object.keys(r.in).some((k) => matches(it, k)));
const outTotal = (m) => Object.values(m.outb).reduce((a, b) => a + b, 0);
function canCraft(m, r) {
  for (const k in r.in) if (count(m, k) < r.in[k]) return false;
  for (const o in r.out) {
    if (usesItem(m, o)) { const k = activeRecipes(m).flatMap((x) => Object.keys(x.in)).find((k) => matches(o, k)); if (count(m, k) >= capFor(m, k)) return false; }
    else if (outTotal(m) >= OUT_CAP) return false;
  }
  return true;
}
function consume(m, key, n) {
  if (!key.startsWith("@")) { m.inb[key] -= n; if (!m.inb[key]) delete m.inb[key]; return; }
  while (n > 0) {
    const it = Object.keys(m.inb).filter((i) => matches(i, key)).sort((a, b) => m.inb[b] - m.inb[a])[0];
    const k = Math.min(n, m.inb[it]); m.inb[it] -= k; n -= k; if (!m.inb[it]) delete m.inb[it];
  }
}
function missing(m) {
  for (const r of activeRecipes(m)) {
    const miss = Object.entries(r.in).filter(([k, n]) => count(m, k) < n && !activeRecipes(m).some((x) => x !== r && Object.keys(x.out).some((o) => matches(o, k))));
    if (miss.length) return miss.map(([k, n]) => `${n} ${label(k).toLowerCase()}`);
  }
  return [];
}
// Machines manuelles (sans énergie, étapes 1-2) : elles ne fabriquent que ce qu'on leur demande, dans l'ordre (m.queue).
// Les machines à tapis et électriques restent automatiques.
const manual = (m) => !MACH[m.name].power;
const QUEUE_MAX = 20;
const bagHas = (key) => S.bag.reduce((n, sl) => n + (sl && matches(sl.it, key) ? sl.n : 0), 0);
const recipeOf = (m, id) => RECIPES[m.name].find((x) => x.id === id);
/** Ce qui reste libre dans la machine pour `key` : ce qu'elle contient, plus ce que la fabrication en cours et la file
 *  vont y remettre (ex. la peinture de la table de peinture), moins ce que la file a déjà réservé. */
function freeIn(m, key) {
  let n = count(m, key);
  const add = (r, sign) => {
    if (!r) return;
    if (sign < 0 && r.in[key]) n -= r.in[key];
    for (const o in r.out) if (r.out[o] >= 1 && matches(o, key) && usesItem(m, o)) n += r.out[o];
  };
  if (m.craft) add(recipeOf(m, m.craft.id), 0);
  for (const id of m.queue || []) add(recipeOf(m, id), -1);
  return n;
}
/** Combien de fois on peut encore lancer `r` avec ce qui est libre dans la machine et dans le sac. */
const possible = (m, r) => Math.max(0, Math.min(...Object.entries(r.in).map(([k, n]) => Math.floor((freeIn(m, k) + bagHas(k)) / n))));
/** Met dans la machine, depuis le sac, ce qui manque pour tout ce qui est dans la file. */
function loadFor(m) {
  const keys = new Set((m.queue || []).flatMap((id) => Object.keys(recipeOf(m, id)?.in || {})));
  for (const k of keys) {
    let need = -freeIn(m, k);
    for (let i = 0; i < BAG && need > 0; i++) {
      const sl = S.bag[i]; if (!sl || !matches(sl.it, k)) continue;
      const t = Math.min(need, sl.n); sl.n -= t; need -= t; m.inb[sl.it] = (m.inb[sl.it] || 0) + t; if (!sl.n) S.bag[i] = null;
    }
  }
}
/** Retire de la fin de la file ce qui ne pourra jamais être fabriqué (vieilles parties où l'on pouvait trop en demander). */
function trimQueue(m) {
  const q = m.queue || [];
  while (q.length && q.some((id) => Object.keys(recipeOf(m, id)?.in || {}).some((k) => freeIn(m, k) < 0))) q.pop();
}
function updateMachine(m, dt) {
  const info = MACH[m.name];
  if (!m.craft) {
    if (manual(m)) {
      trimQueue(m);
      // la première recette de la file qui peut partir (une boule peut attendre la peinture demandée juste après)
      const i = (m.queue ||= []).findIndex((id) => { const r = recipeOf(m, id); return r && canCraft(m, r); });
      if (i >= 0) { const r = recipeOf(m, m.queue[i]); for (const k in r.in) consume(m, k, r.in[k]); m.craft = { id:r.id, t:0, dur:r.t / SPEED[info.stage] }; m.queue.splice(i, 1); }
    } else {
      const r = activeRecipes(m).find((r) => canCraft(m, r));
      if (r) { for (const k in r.in) consume(m, k, r.in[k]); m.craft = { id:r.id, t:0, dur:r.t / SPEED[info.stage] }; }
    }
  }
  if (m.craft) {
    if (info.power === true || info.power === "steam" ? !powered.has("m" + m.id) : info.power === "elec" ? !elecPowered(m) : false) m.stalled = true;
    else {
      m.stalled = false;
      m.craft.t += dt * (m.boost > 0 ? 3 : 1);
      m.boost = Math.max(0, m.boost - dt);
      if (m.craft.t >= m.craft.dur) {
        const r = RECIPES[m.name].find((x) => x.id === m.craft.id);
        for (const o in r.out) {
          const n = r.out[o] < 1 ? (rnd() < r.out[o] ? 1 : 0) : r.out[o];
          if (!n) continue;
          if (usesItem(m, o)) m.inb[o] = (m.inb[o] || 0) + n; else m.outb[o] = (m.outb[o] || 0) + n;
        }
        m.craft = null;
      }
    }
  }
  const pt = portsOf(m);
  if (pt && outTotal(m) > 0) {
    const [bx, by] = pt.out.outside, b = S.belts[bx + "," + by];
    if (b && b.d !== OPP[pt.out.side] && b.on) {
      // une machine pose toujours sur la voie de gauche : la voie de droite reste libre pour les jonctions
      if (laneRoom(b, 0, 0)) { const it = Object.keys(m.outb)[0]; b.lanes[0].push({ it, p:0 }); if (!--m.outb[it]) delete m.outb[it]; }
    }
  }
}

// ---------------------------------------------------------------- tapis à deux voies
// voie 0 = à gauche du sens de marche, voie 1 = à droite. Un tapis qui arrive par le flanc d'un autre dépose sur la voie de ce côté.
const laneRoom = (b, lane, at) => b.lanes[lane].every((o) => Math.abs(o.p - at) >= GAP);
let powered = new Set();
/** Alimenté par le réseau électrique : calculé dans computePower (générateurs avec du bois, 6 appareils chacun, reliés par des poteaux). */
const elecPowered = (e) => powered.has("e" + e.id);
function computePower() {
  powered = new Set();
  for (const c of S.ents) {
    if (c.kind !== "crank") continue;
    c.load = 0;
    if (c.reserve <= 0) continue;
    const ms = S.ents.filter((m) => m.kind === "machine" && MACH[m.name].power === true && !powered.has("m" + m.id))
      .map((m) => [distTo(m, c.x, c.y), m]).filter(([d]) => d <= CRANK_R).sort((a, b) => a[0] - b[0]).slice(0, 4);
    const bs = Object.values(S.belts).filter((b) => (b.k || "bois") === "bois" && !powered.has("b" + b.x + "," + b.y))
      .map((b) => [Math.max(Math.abs(b.x - c.x), Math.abs(b.y - c.y)), b]).filter(([d]) => d <= CRANK_R).sort((a, b) => a[0] - b[0]).slice(0, 8);
    for (const [, m] of ms) powered.add("m" + m.id);
    for (const [, b] of bs) powered.add("b" + b.x + "," + b.y);
    c.load = ms.length + bs.length;
  }
  // vapeur : chaque chaudière qui a du bois alimente les BOILER_N machines à vapeur les plus proches (à BOILER_R cases)
  for (const c of S.ents) {
    if (c.kind !== "boiler") continue;
    c.load = 0; if (c.fuel <= 0) continue;
    const ms = S.ents.filter((m) => m.kind === "machine" && MACH[m.name].power === "steam" && !powered.has("m" + m.id))
      .map((m) => [distTo(m, c.x, c.y), m]).filter(([d]) => d <= BOILER_R).sort((a, b) => a[0] - b[0]).slice(0, BOILER_N);
    for (const [, m] of ms) powered.add("m" + m.id);
    c.load = ms.length;
  }
  // électricité : un seul réseau ; GEN_N appareils par générateur qui a du bois ; un appareil est relié s'il a un poteau à POLE_R cases
  const gens = S.ents.filter((g) => g.kind === "generator" && g.fuel > 0), poles = S.ents.filter((q) => q.kind === "pole");
  const users = S.ents.filter((e) => ((e.kind === "machine" && MACH[e.name].power === "elec") || e.kind === "extractor") && poles.some((q) => distTo(e, q.x, q.y) <= POLE_R));
  const cap = gens.reduce((n, g) => n + (g.cap || GEN_N), 0); // g.cap : seulement pour la démo
  users.slice(0, cap).forEach((e) => powered.add("e" + e.id));
  const used = Math.min(users.length, cap);
  for (const g of S.ents) if (g.kind === "generator") g.load = g.fuel > 0 ? used / gens.length : 0;
}
function beltInput(b) {
  const [dx, dy] = DIRS[b.d], back = S.belts[(b.x - dx) + "," + (b.y - dy)];
  if (back && back.d === b.d) return OPP[b.d];
  const feeders = [];
  for (const side of ["E", "W", "N", "S"]) {
    if (side === b.d || side === OPP[b.d]) continue;
    const [sx, sy] = DIRS[side], n = S.belts[(b.x + sx) + "," + (b.y + sy)];
    if (n && n.d === OPP[side]) feeders.push(side);
  }
  return feeders.length === 1 ? feeders[0] : OPP[b.d];
}
function beltRow(b) { const k = beltInput(b) + ">" + b.d; return BELT_ROWS.includes(k) ? k : b.d; }
const EDGE = { E:[32, 14], W:[0, 14], N:[16, 0], S:[16, 30] }, CENTER = [16, 14];
const LVEC = { E:[0, -1], S:[1, 0], W:[0, 1], N:[-1, 0] };
function beltPos(b, lane, p) {
  const ent = beltInput(b), a = EDGE[ent], z = EDGE[b.d];
  const dir = p < 0.5 ? OPP[ent] : b.d;
  const [x, y] = p < 0.5 ? [a[0] + (CENTER[0] - a[0]) * p * 2, a[1] + (CENTER[1] - a[1]) * p * 2]
    : [CENTER[0] + (z[0] - CENTER[0]) * (p - 0.5) * 2, CENTER[1] + (z[1] - CENTER[1]) * (p - 0.5) * 2];
  const [lx, ly] = LVEC[dir], off = lane === 0 ? 5 : -5;
  return [b.x * T + x + lx * off, b.y * T + y + ly * off];
}
function deliver(b, lane, it) {   // l'objet de tête est au bout du tapis : où va-t-il ?
  const [dx, dy] = DIRS[b.d], nx = b.x + dx, ny = b.y + dy;
  const nb = S.belts[nx + "," + ny];
  if (nb) {
    if (nb.d === OPP[b.d]) return false;
    const side = OPP[b.d];                           // bord de nb par lequel on arrive
    if (beltInput(nb) === side) { if (!laneRoom(nb, lane, 0)) return false; nb.lanes[lane].push({ it, p:0 }); return true; }
    const l2 = side === LEFT[nb.d] ? 0 : 1;          // jonction par le flanc
    if (!laneRoom(nb, l2, 0.5)) return false;
    nb.lanes[l2].push({ it, p:0.5 }); return true;
  }
  const e = entAt(nx, ny);
  if (!e) return false;
  if (e.kind === "crate") { if (!price(it)) return false; sell(it, 1, nx, ny); return true; }
  if (e.kind === "chest") return chestAdd(e, it, 1) === 1;
  if (e.kind === "boiler" || e.kind === "generator") { if (it !== "bois" || e.fuel > FUEL_CAP - 1) return false; e.fuel++; return true; }
  if (e.kind === "machine") {
    const pt = portsOf(e); if (!pt) return false;
    const okPort = ["in", "in2"].some((k) => pt[k] && pt[k].inside[0] === nx && pt[k].inside[1] === ny && pt[k].side === OPP[b.d]);
    if (!okPort || !accepts(e, it)) return false;   // ingrédient en trop : la voie se bloque
    e.inb[it] = (e.inb[it] || 0) + 1; return true;
  }
  return false;
}
function updateBelts(dt) {
  for (const b of Object.values(S.belts)) {
    b.on = (b.k || "bois") === "bois" ? powered.has("b" + b.x + "," + b.y) : true;
    const V = BELT_SPEED[b.k || "bois"];
    if (!b.on) continue;
    for (let lane = 0; lane < 2; lane++) {
      const L = b.lanes[lane]; L.sort((a, c) => c.p - a.p);
      let limit = 1; b.blocked = b.blocked || [false, false]; b.bt = b.bt || [0, 0]; b.blocked[lane] = false;
      for (let i = 0; i < L.length; i++) {
        const o = L[i];
        o.p = Math.min(o.p + V * dt, limit);
        if (i === 0 && o.p >= 1) {
          if (deliver(b, lane, o.it)) { L.shift(); i--; limit = 1; continue; }
          b.blocked[lane] = true;
        }
        limit = o.p - GAP;
      }
      b.bt[lane] = b.blocked[lane] ? b.bt[lane] + dt : 0;
    }
  }
  // goulottes (le tas verse sur le tapis qui part de lui) et extracteurs (étape 5) : la matière tombe sur la voie de leur côté
  for (const s of S.ents) {
    const chute = s.kind === "source" && s.chute && s.stock >= 1, ext = s.kind === "extractor" && elecPowered(s);
    if (!chute && !ext) continue;
    // jusqu'à deux objets par pas (un par voie) : avec le pas d'une seconde du rattrapage hors ligne, 2 objets/s passent encore
    s.acc = Math.min(2, (s.acc || 0) + dt * (ext ? s.rate : CHUTE_RATE));
    for (let put = 0; put < 2 && s.acc >= 1 && !(chute && s.stock < 1); put++)
    for (const [side, [dx, dy]] of Object.entries(DIRS)) {
      const b = S.belts[(s.x + dx) + "," + (s.y + dy)];
      if (!b || !b.on || b.d === OPP[side]) continue;
      const from = OPP[side];                          // côté du tapis où se trouve la source
      const lane = from === b.d || from === OPP[b.d] ? (s.lane || 0) : from === LEFT[b.d] ? 0 : 1;
      const at = from === OPP[b.d] ? 0 : 0.5;
      if (!laneRoom(b, lane, at)) continue;
      b.lanes[lane].push({ it:s.gives, p:at }); if (chute) s.stock--; s.acc -= 1; s.lane = 1 - (s.lane || 0); break;
    }
  }
}

// ---------------------------------------------------------------- ventes, coffres, marché, contrats
function sell(it, n, x, y) {
  const v = price(it) * n;
  S.coins += v; S.earned += v; S.stats[it] = (S.stats[it] || 0) + n;
  for (let i = 0; i < n; i++) S.sales.push([S.time, it]);
  if (v && x != null) fx(x * T + 16, y * T, "+" + fmtN(v), "#ffd65a");
  for (const c of S.contracts) if (!c.done && matches(it, c.key)) {
    c.got = Math.min(c.n, c.got + n);
    if (c.got >= c.n) {
      c.done = true;
      const fast = S.time - c.t0 < c.bonus_s, st = Math.round(c.stars * (fast ? 1.5 : 1));
      S.stars += st; S.coins += c.pay; S.earned += c.pay;
      toast(`Commande remplie : ${c.n} × ${label(c.key).toLowerCase()} — ${st} étoiles${fast ? " (bonus de rapidité)" : ""} et ${c.pay} pièces`);
    }
  }
}
function chestAdd(c, it, n) {
  const tot = Object.values(c.store).reduce((a, b) => a + b, 0), k = Math.max(0, Math.min(n, 200 - tot));
  if (k) c.store[it] = (c.store[it] || 0) + k; return k;
}
function buy(raw, n) {
  const s = S.ents.find((e) => e.kind === "source" && e.gives === raw); if (!s) return;
  n = Math.min(n, MARKET_MAX - Math.floor(s.stock)); if (n <= 0) { toast("Le tas est plein (200)."); return; }
  const cost = n * RAW[raw].cost; if (S.coins < cost) { toast("Pas assez de pièces"); return; }
  S.coins -= cost; s.stock += n; fx(s.x * T + 16, s.y * T, "+" + n, "#9fe3ff"); ui.dirty = true;
}
const SELL = { 1:["boule_rouge", "boule_verte", "boule_or", "boule_bleue", "@boule_peinte"], 2:["couronne", "etoile_bois", "sapin_decore"], 3:["@boule_finie", "etoile_doree", "guirlande"], 4:[], 5:[] };
const BASE_VALUE = { 1:20, 2:150, 3:1200, 4:4000, 5:9000 };
// ---- Commandes du jour : payées en pièces de la salle par le serveur (/api/usine/<salle>/commande), 3 par jour.
// Les mêmes pour toute la salle (tirées de la date et de la salle), à la taille de l'étape de chacun.
const ORDER_PAY = [600, 1200, 1800], ORDER_MULT = [1, 2, 3]; // le montant affiché ; c'est le serveur qui paie (même tableau)
const parisDay = () => new Intl.DateTimeFormat("en-CA", { timeZone:"Europe/Paris" }).format(new Date());
function dailyOrders() {
  const day = parisDay();
  if (S.daily?.day !== day) {
    let h = 7; for (const ch of day + (ROOM || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const r = () => (h = (h * 1103515245 + 12345) >>> 0) / 2 ** 32;
    const keys = []; for (let s = 1; s <= S.stage; s++) keys.push(...SELL[s]);
    S.daily = { day, orders:ORDER_MULT.map((m) => {
      const key = keys[Math.floor(r() * keys.length)], p = price(iconOf(key)) || 1;
      return { key, n:Math.max(3, Math.round(BASE_VALUE[S.stage] * m / p)), done:false };
    }) };
  }
  return S.daily.orders;
}
const chestHas = (key) => S.ents.reduce((n, c) => n + (c.kind === "chest" ? Object.entries(c.store).reduce((k, [it, q]) => k + (matches(it, key) ? q : 0), 0) : 0), 0);
const haveFor = (key) => bagHas(key) + chestHas(key);
/** Retire n objets (sac d'abord, puis coffres). */
function takeFor(key, n) {
  for (let i = 0; i < BAG && n > 0; i++) { const sl = S.bag[i]; if (!sl || !matches(sl.it, key)) continue; const t = Math.min(n, sl.n); sl.n -= t; n -= t; if (!sl.n) S.bag[i] = null; }
  for (const c of S.ents) if (c.kind === "chest") for (const it of Object.keys(c.store)) {
    if (n <= 0 || !matches(it, key)) continue; const t = Math.min(n, c.store[it]); c.store[it] -= t; n -= t; if (!c.store[it]) delete c.store[it];
  }
}
async function deliverOrder(i) {
  const o = dailyOrders()[i];
  if (!o || o.done || o.sending || haveFor(o.key) < o.n) return;
  if (!API) return toast("Ouvre l'usine depuis ta salle pour livrer les commandes du jour.");
  o.sending = true; ui.dirty = true;
  try {
    const r = await fetch(API + "/commande", { method:"POST", body:JSON.stringify({ slot:i }), headers:{ "content-type":"application/json" } }), j = await r.json();
    if (r.ok || r.status === 409) { takeFor(o.key, o.n); o.done = true; push(); }
    toast(r.ok ? `Commande livrée : +${fmt(j.coins)} pièces de la salle !` : j.error || "Livraison impossible pour l'instant.");
  } catch { toast("Livraison impossible pour l'instant."); }
  o.sending = false; ui.dirty = true;
}
function newContract() {
  const keys = []; for (let s = 1; s <= S.stage; s++) keys.push(...SELL[s]);
  const free = keys.filter((k) => !S.contracts.some((c) => c.key === k)), pool = free.length ? free : keys;
  const key = pool[Math.floor(rnd() * pool.length)];
  const [stars, mult] = [[15, 1], [30, 2], [55, 3.5]][Math.floor(rnd() * 3)];
  const p = price(iconOf(key)) || 1, n = Math.max(2, Math.round(BASE_VALUE[S.stage] * mult / p));
  S.contracts.push({ key, n, got:0, stars, pay:Math.round(n * p * 0.5), t0:S.time, dl:20 * 60, bonus_s:7 * 60, done:false });
}
function updateContracts() {
  S.contracts = S.contracts.filter((c) => !(c.done || S.time - c.t0 > c.dl));
  while (S.contracts.length < 3) newContract();
}
function rateOf(key, mins = 10) {
  S.sales = S.sales.filter(([t]) => t > S.time - 30 * 60);
  return S.sales.filter(([t, it]) => t > S.time - mins * 60 && matches(it, key)).length / Math.min(mins, Math.max(1, S.time / 60));
}
function gateStatus() {
  const g = GATES[S.stage + 1]; if (!g) return null;
  const parts = [{ text:`Pièces gagnées : ${fmt(S.earned)} / ${fmt(g.coins)}`, frac:Math.min(1, S.earned / g.coins) }];
  if (g.rate) { const r = rateOf(g.rate.key); parts.push({ text:`${RATE_LABEL[g.rate.key]} : ${r.toFixed(1)} / ${g.rate.per_min} par min`, frac:Math.min(1, r / g.rate.per_min) }); }
  for (const p of parts) p.ok = p.frac >= 1;
  return { parts, ok:parts.every((p) => p.ok) };
}
function advance() {
  const st = gateStatus(); if (!st || !st.ok) return;
  S.stage++; addSources(S.stage);
  toast(`Étape ${S.stage} : ${STAGE_NAMES[S.stage]} ! ${UNLOCK_TEXT[S.stage]}`, 6000); ui.dirty = true;
}

// ---------------------------------------------------------------- le personnage
function face(e) {
  const p = S.player, t = tilesOf(e).reduce((b, t) => (Math.abs(t[0] - p.x) + Math.abs(t[1] - p.y) < Math.abs(b[0] - p.x) + Math.abs(b[1] - p.y) ? t : b));
  const dx = t[0] - p.x, dy = t[1] - p.y;
  p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
}
function interact(e, first) {          // appelée au toucher, puis toutes les 0,25 s tant que le doigt reste appuyé
  const p = S.player;
  if (!inRange(e)) {
    if (!p.path.length || !p.job || p.job !== e.id) {
      const path = bfs(p.x, p.y, (x, y) => distTo(e, x, y) <= RANGE);
      if (!path) { if (first) toast("Impossible d'y accéder"); return; }
      p.path = path; p.job = e.id;
    }
    return;
  }
  face(e); p.job = null;
  if (e.kind === "source") { if (first) select(e); return; } // on choisit dans sa fiche combien en prendre
  if (e.kind === "crate") {
    let v = 0;
    for (let i = 0; i < BAG; i++) { const s = S.bag[i]; if (s && price(s.it)) { v += price(s.it) * s.n; sell(s.it, s.n); S.bag[i] = null; } }
    if (v) { fx(e.x * T + 16, e.y * T, "+" + fmtN(v), "#ffd65a"); p.work = 0.3; }
    else if (first) toast("La caisse achète les produits finis : rien à vendre dans le sac.");
    return;
  }
  if (e.kind === "chest") { if (first) select(e); return; } // on choisit dans sa fiche ce qu'on dépose ou reprend
  if (e.kind === "crank") { e.reserve = Math.min(CRANK_MAX, e.reserve + (first ? CRANK_WIND : CRANK_WIND / 4)); p.work = 0.4; return; }
  if (e.kind === "flowerbed") {
    if (first) {
      if (!e.planted) { e.planted = true; e.grown = 0; p.work = 0.4; fx(e.x * T + 32, e.y * T, "Planté !", "#6cc46a"); }
      else if (e.grown >= FLOWER_TIME) pick(e);
      select(e); loadFlowers();
    }
    return;
  }
  if (e.kind === "boiler" || e.kind === "generator") {
    if (first) { const n = Math.min(bagCount("bois"), Math.floor(FUEL_CAP - e.fuel)); if (n > 0) { bagTake("bois", n); e.fuel += n; p.work = 0.3; } select(e); }
    return;
  }
  if (e.kind === "extractor" || e.kind === "pole") { if (first) select(e); return; }
  if (e.kind !== "machine") return;
  let moved = 0;
  for (let i = 0; i < BAG; i++) {                       // déposer ce que la machine accepte
    const s = S.bag[i]; if (!s) continue;
    while (s.n > 0 && accepts(e, s.it)) { e.inb[s.it] = (e.inb[s.it] || 0) + 1; s.n--; moved++; }
    if (!s.n) S.bag[i] = null;
  }
  for (const it of Object.keys(e.outb)) { const k = bagAdd(it, e.outb[it]); e.outb[it] -= k; moved += k; if (!e.outb[it]) delete e.outb[it]; }
  if (e.craft && !e.stalled) { e.boost = 0.4; p.work = 0.4; }
  else if (moved) p.work = 0.3;
  if (first) {
    select(e, true);
    if (!moved && !e.craft && !manual(e)) toast(e.stalled ? "Pas d'énergie : remonte une manivelle à côté." : `${MACH[e.name].name} : il manque ${missing(e).join(", ") || "de la place en sortie"}.`);
  }
}
function updatePlayer(dt) {
  const p = S.player;
  // Doigt gardé sur le sol : on marche vers lui, la destination est recalculée en continu (comme Stardew Valley mobile).
  // On finit toujours le pas en cours (le nouveau trajet part de la case visée), pour ne pas faire demi-tour au milieu.
  if (ui.follow && (ui.follow.t -= dt) <= 0) {
    ui.follow.t = 0.15;
    const [x, y] = tileAt({ clientX:ui.follow.cx, clientY:ui.follow.cy });
    if (!ui.target || ui.target[0] !== x || ui.target[1] !== y) {
      const [fx, fy] = p.path[0] || [p.x, p.y], path = bfs(fx, fy, (a, b) => a === x && b === y);
      if (path) { p.path = p.path.length ? [p.path[0], ...path] : path; ui.target = [x, y]; p.job = null; p.menu = null; p.harvest = null; }
    }
  }
  if (p.work > 0) p.work -= dt;
  if (p.path.length) {
    const [tx, ty] = p.path[0], sp = 5 * dt;
    const dx = tx - p.px, dy = ty - p.py, d = Math.hypot(dx, dy);
    if (d > 0.01) p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    if (d <= sp) {
      p.px = tx; p.py = ty; p.x = tx; p.y = ty; p.path.shift();
      if (!p.path.length && p.job) { const e = byId(p.job); if (e) interact(e, true); }
      if (!p.path.length && p.menu) { const e = byId(p.menu); p.menu = null; if (e) arrive(e); }
    } else { p.px += dx / d * sp; p.py += dy / d * sp; }
  }
  if (ui.hold) { ui.holdT -= dt; if (ui.holdT <= 0) { ui.holdT = 0.25; const e = byId(ui.hold); if (e) interact(e, false); } }
  S.player.harvest = null; // ancienne récolte automatique (vieilles parties)
}

// ---------------------------------------------------------------- construction
function costOf(key) {
  if (key.startsWith("extractor")) key = "extractor_sable"; // un extracteur coûte pareil quelle que soit sa matière
  for (const s in BUILD) for (const b of BUILD[s]) if (b[0] === key) return b[1]; return 0;
}
function nameOf(key) { if (MACH[key]) return MACH[key].name; for (const s in BUILD) for (const b of BUILD[s]) if (b[0] === key) return b[2]; return key; }
function unlockOf(key) { for (const s in BUILD) for (const b of BUILD[s]) if (b[0] === key) return +s; return 9; }
function stageOf(key) { if (MACH[key]) return MACH[key].stage; if (key.startsWith("extractor")) return 5; return STAGE_OF[key] || 1; }
/** L'objet a-t-il quatre orientations ? (le poteau n'en a pas ; l'extracteur n'en a qu'une, vers l'est) */
const hasOri = (key) => !!META[stageOf(key)].objects[key]?.s;
function canPlace(key, o, x, y, ignore) {
  if (key === "belt") return inFloor(x, y) && !entAt(x, y);
  const f = sprOf(key, stageOf(key), o).footprint;
  for (let j = 0; j < f[1]; j++) for (let i = 0; i < f[0]; i++) {
    const tx = x + i, ty = y + j, e = entAt(tx, ty);
    if (!inFloor(tx, ty) || (e && e !== ignore) || S.belts[tx + "," + ty] || (S.player.x === tx && S.player.y === ty)) return false;
  }
  return true;
}
function place(key, rot, x, y) {
  const o = ROT[rot], cost = costOf(key);
  if (key === "belt") {
    if (!canPlace(key, o, x, y)) return false;
    const k = x + "," + y, ex = S.belts[k];
    const bk = ui.beltK || "bois", bc = BELT_COST[bk];
    if (ex) { // repasser sur un tapis : on le tourne, et on l'améliore si le nouveau est meilleur (on paie la différence)
      ex.d = BROT[rot];
      const up = bc - BELT_COST[ex.k || "bois"];
      if (up > 0) { if (S.coins < up) { toast("Pas assez de pièces"); return false; } ex.k = bk; S.coins -= up; }
      return true;
    }
    if (S.coins < bc) { toast("Pas assez de pièces"); return false; }
    S.belts[k] = { x, y, d:BROT[rot], k:bk, lanes:[[], []], on:false }; S.coins -= bc; return true;
  }
  if (S.coins < cost) { toast("Pas assez de pièces"); return false; }
  if (!canPlace(key, o, x, y)) { toast("Place occupée"); return false; }
  const kind = MACH[key] ? "machine" : ["crank", "boiler", "generator", "pole"].includes(key) ? key : key.startsWith("extractor") ? "extractor" : key === "serre_fleurs" ? "flowerbed" : "chest";
  addEnt({ kind, name:key, stage:stageOf(key), x, y, o:hasOri(key) ? o : key.startsWith("extractor") ? "e" : undefined, store:kind === "chest" ? {} : undefined,
    ...(kind === "flowerbed" ? { planted:false, grown:0 } : kind === "boiler" || kind === "generator" ? { fuel:0 } : kind === "extractor" ? { gives:"sable", rate:0.25, acc:0, lane:0 } : {}) });
  S.coins -= cost; return true;
}
function demolish(x, y) {
  const b = S.belts[x + "," + y];
  if (b) { delete S.belts[x + "," + y]; S.coins += BELT_COST[b.k || "bois"]; return; }
  const e = entAt(x, y);
  if (!e || ["source", "crate", "deco", "rug"].includes(e.kind)) return;
  if (e.kind === "chest" && S.ents.filter((c) => c.kind === "chest").length === 1) { toast("Garde au moins un coffre."); return; }
  S.ents = S.ents.filter((z) => z !== e); invalidate();
  S.coins += Math.round(costOf(e.name) / 2);
  if (ui.sel === e.id) ui.sel = null;
  toast(`${nameOf(e.name)} démonté : la moitié du prix est rendue.`);
}
// Déplacer un objet déjà posé (appui long) : machines, coffres, manivelles, énergie, décorations (pas les tas ni la caisse).
const MOVABLE = ["machine", "chest", "crank", "boiler", "generator", "pole", "extractor", "flowerbed", "deco", "source"];
/** L'objet `key` (étape `stage`, orientation `o`) tient-il avec son coin haut-gauche en (x, y) ? `ignore` : l'objet qu'on déplace. */
function fits(key, stage, o, x, y, ignore) {
  const f = sprOf(key, stage, o).footprint || [1, 1];
  for (let j = 0; j < f[1]; j++) for (let i = 0; i < f[0]; i++) {
    const tx = x + i, ty = y + j, e = entAt(tx, ty);
    if (!inFloor(tx, ty) || (e && e !== ignore) || S.belts[tx + "," + ty] || (S.player.x === tx && S.player.y === ty)) return false;
  }
  return true;
}
/** Va juste à côté de l'objet (s'il n'y est pas déjà), agit dessus, puis ouvre sa fiche. */
function reach(e) {
  const p = S.player;
  if (distTo(e, p.x, p.y) <= 1) return arrive(e);
  const path = bfs(p.x, p.y, (x, y) => distTo(e, x, y) <= 1);
  if (!path) return toast("Impossible d'y accéder");
  p.path = path; p.job = null; p.menu = e.id; p.harvest = null; ui.target = null;
}
function arrive(e) {
  S.player.menu = null;
  if (e.kind !== "source" && e.kind !== "deco") interact(e, true); // un tas : on choisit dans sa fiche combien en prendre
  select(e);
  if (ui.pending && ui.pending.id === e.id) { const run = ui.pending.run; ui.pending = null; run(); }
}
/** Fait `run` à côté de `e` : tout de suite s'il est à portée, sinon en y allant d'abord. */
function doNear(e, run) {
  if (inRange(e)) { face(e); run(); S.player.work = 0.3; ui.dirty = true; return; }
  ui.pending = { id:e.id, run }; reach(e);
}
/** Prendre `n` matières premières sur un tas (pas plus que le tas et la place dans le sac). */
function takeRaw(e, n) {
  const k = Math.min(n, Math.floor(e.stock), bagRoom(e.gives));
  if (k <= 0) return toast(e.stock < 1 ? `Tas de ${label(e.gives).toLowerCase()} vide : il se recharge, ou achète au marché.` : "Sac plein");
  e.stock -= k; bagAdd(e.gives, k); fx(e.x * T + 16, e.y * T, "+" + k, "#9fe3ff");
}
const chestTotal = (c) => Object.values(c.store).reduce((a, b) => a + b, 0);
/** Reprendre `n` objets `it` du coffre vers le sac (pas plus que la place dans le sac). */
function chestTake(c, it, n) {
  const k = Math.min(n, c.store[it] || 0, bagRoom(it));
  if (k <= 0) { if (c.store[it]) toast("Sac plein"); return 0; }
  bagAdd(it, k); c.store[it] -= k; if (!c.store[it]) delete c.store[it]; return k;
}
/** Déposer `n` objets `it` du sac dans le coffre (pas plus que la place dans le coffre). */
function chestPut(c, it, n) {
  const k = chestAdd(c, it, Math.min(n, bagCount(it)));
  if (k <= 0) { if (bagCount(it)) toast("Coffre plein (200)."); return 0; }
  bagTake(it, k); return k;
}
// ---- pose : un « fantôme » qu'on fait glisser, qu'on tourne, puis ✓ (ou ✕). Pour un nouvel objet comme pour un déplacement.
function startMove(e) {
  ui.place = { key:e.name, stage:e.stage, o:e.o, x:e.x, y:e.y, id:e.id, cost:0 };
  ui.sel = e.id; closePanel(); try { navigator.vibrate?.(12); } catch {}
  ui.dirty = true;
}
// Un tapis se reprend aussi à l'appui long : il garde les objets posés dessus (comme Factorio / Shapez, on le ramasse et on le repose ;
// les machines et les tapis se relient par voisinage, la chaîne se reconnecte dès qu'on remet les pièces bout à bout).
function startMoveBelt(b) {
  ui.place = { key:"belt", belt:b.x + "," + b.y, o:b.d, x:b.x, y:b.y, cost:0 };
  ui.follow = null; S.player.path = S.player.path.slice(0, 1); closePanel(); try { navigator.vibrate?.(12); } catch {}
  ui.dirty = true;
}
const footOf = (q) => (q.key === "belt" ? [1, 1] : sprOf(q.key, q.stage, q.o).footprint || [1, 1]);
function startNew(key) {
  if (key === "serre_fleurs" && S.ents.filter((e) => e.kind === "flowerbed").length >= MAX_BEDS) return toast(`${MAX_BEDS} serres au plus.`);
  const stage = stageOf(key), o = hasOri(key) ? ROT[ui.rot] : key.startsWith("extractor") ? "e" : undefined, p = S.player;
  // première place libre autour du joueur, pour n'avoir qu'à faire glisser
  let best = null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (fits(key, stage, o, x, y) && (!best || Math.hypot(x - p.x, y - p.y) < Math.hypot(best[0] - p.x, best[1] - p.y))) best = [x, y];
  if (!best) return toast("Plus de place dans l'atelier.");
  ui.place = { key, stage, o, x:best[0], y:best[1], cost:costOf(key) };
  ui.mode = "hand"; ui.build = null; closePanel(); ui.dirty = true;
}
const placeOk = () => {
  const q = ui.place, k = q.x + "," + q.y;
  if (q.key === "belt") return inFloor(q.x, q.y) && !entAt(q.x, q.y) && (!S.belts[k] || k === q.belt);
  return fits(q.key, q.stage, q.o, q.x, q.y, q.id ? byId(q.id) : null) && S.coins >= q.cost;
};
function rotatePlace() {
  const q = ui.place; if (!q || !q.o || q.key.startsWith("extractor")) return;
  const order = q.key === "belt" ? BROT : ROT; q.o = order[(order.indexOf(q.o) + 1) % 4]; ui.dirty = true;
}
/** Ramasser ce qu'on tient : un tapis est remboursé, une machine est démontée (la moitié du prix, comme « Démonter »). */
function removePlace() {
  const q = ui.place; if (!q) return;
  if (q.belt) { const b = S.belts[q.belt]; delete S.belts[q.belt]; S.coins += BELT_COST[b.k || "bois"]; toast("Tapis retiré."); }
  else if (q.id) { const e = byId(q.id); if (e) demolish(e.x, e.y); }
  ui.place = null; ui.dirty = true;
}
function confirmPlace() {
  const q = ui.place;
  if (!q || !placeOk()) return toast(S.coins < (q?.cost ?? 0) ? "Pas assez de pièces" : "Pas la place ici.");
  if (q.belt) { const b = S.belts[q.belt]; delete S.belts[q.belt]; Object.assign(b, { x:q.x, y:q.y, d:q.o }); S.belts[q.x + "," + q.y] = b; }
  else if (q.id) { const e = byId(q.id); Object.assign(e, { x:q.x, y:q.y, o:q.o }); invalidate(); }
  else place(q.key, ROT.indexOf(q.o), q.x, q.y);
  ui.place = null; ui.dirty = true;
}
function cancelPlace() { ui.place = null; ui.dirty = true; }
function expand() {
  const n = nextExpand();
  if (!n) return;
  if (S.coins < n[2]) return toast("Pas assez de pièces");
  S.coins -= n[2]; S.area = { w:n[0], h:n[1] }; invalidate();
  toast(`L'atelier s'agrandit : ${n[0]} × ${n[1] - Y0} cases !`);
}
/** Amélioration d'une machine : elle devient la suivante de sa famille, à la même place. */
function upgrade(e) {
  const t = UPGRADE[e.name], cost = t && costOf(t), st = t && MACH[t].stage;
  if (!t || !cost) return toast("Pas encore d'amélioration pour cette machine.");
  if (st > S.stage) return toast(`Disponible à l'étape ${st}.`);
  if (S.coins < cost) return toast("Pas assez de pièces");
  if (!fits(t, st, e.o, e.x, e.y, e)) return toast("Pas la place : la nouvelle machine est plus grande. Déplace-la d'abord.");
  // ce qu'elle contenait revient dans le sac (les recettes changent)
  let lost = 0;
  for (const box of [e.inb, e.outb]) for (const [it, n] of Object.entries(box)) lost += n - bagAdd(it, n);
  Object.assign(e, { name:t, stage:st, inb:{}, outb:{}, craft:null, recipe:"auto", color:null, queue:[] });
  S.coins -= cost; invalidate();
  toast(`Amélioré : ${MACH[t].name} !${lost ? ` (${lost} objet${lost > 1 ? "s" : ""} perdu${lost > 1 ? "s" : ""} : sac plein)` : ""}`);
}
function rotateEnt(e) {
  const o = ROT[(ROT.indexOf(e.o) + 1) % 4];
  if (canPlace(e.name, o, e.x, e.y, e)) { e.o = o; invalidate(); } else toast("Pas la place pour tourner");
}

// ---------------------------------------------------------------- boucle
let last = performance.now(), powerT = 0, uiT = 0;
function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!catching) step(dt);
  draw(now / 1000);
  uiT -= dt; if (uiT <= 0 || ui.dirty) { uiT = 0.25; renderUI(); ui.dirty = false; }
  requestAnimationFrame(tick);
}
function step(dt) {
  S.time += dt;
  powerT -= dt; if (powerT <= 0) { computePower(); powerT = catching ? 2 : 0.25; } // pendant le rattrapage : l'énergie bouge peu
  for (const c of S.ents) {
    if (c.kind === "crank" && c.load > 0) c.reserve = Math.max(0, c.reserve - dt);
    if (c.kind === "flowerbed" && c.planted) c.grown = Math.min(FLOWER_TIME, (c.grown || 0) + dt);
    if ((c.kind === "boiler" || c.kind === "generator") && c.load > 0) c.fuel = Math.max(0, c.fuel - dt * c.load * FUEL_RATE[c.kind]);
    if (c.kind === "source" && c.stock < RAW[c.gives].cap) c.stock = Math.min(RAW[c.gives].cap, c.stock + RAW[c.gives].refill * dt);
  }
  for (const m of S.ents) if (m.kind === "machine") updateMachine(m, dt);
  updateBelts(dt);
  updatePlayer(dt);
  if (Math.floor(S.time) % 2 === 0) updateContracts();
  for (const f of fxs) f.t += dt;
  fxs = fxs.filter((f) => f.t < 1.2);
}

// ---------------------------------------------------------------- rendu
const cv = document.getElementById("game"), ctx = cv.getContext("2d");
const imgs = {};
function img(path) { let i = imgs[path]; if (!i) { i = imgs[path] = new Image(); i.src = path; } return i.complete && i.naturalWidth ? i : null; }
const stageImg = (stage, file) => img(`usine/etape-${stage}/${file}`);
let zoom = 1, cam = { x:0, y:0 }, cssW = 0, cssH = 0, dpr = 1, camReady = false;
// Zone morte de la caméra (fraction de la vue, centrée) : le personnage s'y déplace sans que la caméra bouge.
const DEAD_W = 0.4, DEAD_H = 0.35;
const ZOOMS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4]; // paliers fins pour bien ajuster
function resize() {
  const r = cv.parentElement.getBoundingClientRect();
  dpr = Math.max(1, Math.round(window.devicePixelRatio || 1)); cssW = r.width; cssH = r.height;
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  cv.style.width = cssW + "px"; cv.style.height = cssH + "px";
}
function fitZoom() { let z = 1; for (const c of ZOOMS) if (S.area.w * T * c <= cssW * 1.05) z = c; zoom = z; }
let fxs = [];
function fx(x, y, text, color) { fxs.push({ x, y, text, color, t:0 }); }
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
function drawItem(it, x, y) { const i = img("usine/commun/objets_16x16.png"); if (i) ctx.drawImage(i, ITEMS.indexOf(iconOf(it)) * 16, 0, 16, 16, Math.round(x), Math.round(y), 16, 16); }
function drawIcon(name, x, y) { const i = img("usine/ui/icones.png"); if (i) ctx.drawImage(i, ICONS.indexOf(name) * 16, 0, 16, 16, Math.round(x), Math.round(y), 16, 16); }
function text(s, x, y, color, align = "center") {      // police bitmap, 8 px = 1 pixel de police par pixel monde
  ctx.font = '8px "Chaumiere Pixel"'; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = "#1c1820";
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(s, x + dx, y + dy);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function bar(x, y, w, frac, color) {
  ctx.fillStyle = "#1c1820"; ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = "#3d2216"; ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = color; ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), 3);
}
function charSheet() {
  const av = S.avatar;
  return { body:COLORABLE.includes(av.species) ? `usine/personnages/${av.species}-${av.color}.png` : `usine/personnages/${av.species}.png`,
    acc:av.santa ? `usine/accessoires/${av.species}-santa.png` : null };
}
function drawPlayer(time) {
  const a = S.player, moving = a.path.length > 0, working = a.work > 0;
  const anim = working ? "work" : moving ? "walk" : "idle";
  const row = ["idle", "walk", "work", "carry"].indexOf(anim) * 4 + ["down", "left", "right", "up"].indexOf(a.dir);
  const f = Math.floor(time * (anim === "idle" ? 3 : 8)) % 4;
  const x = Math.round(a.px * T), y = Math.round(a.py * T) + 8, sh = charSheet();
  ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(x + 16, y + 30, 9, 3, 0, 0, 7); ctx.fill();
  for (const p of [sh.body, sh.acc]) { if (!p) continue; const i = img(p); if (i) ctx.drawImage(i, f * 32, row * 48, 32, 48, x, y - 14, 32, 48); }
}
function drawEnt(e, time) {
  const s = spr(e), i = stageImg(e.stage, s.file);
  const working = (e.kind === "machine" && e.craft && !e.stalled) || ((e.kind === "extractor" || e.kind === "generator") && elecPowered(e));
  const frames = s.frames || 1, f = e.kind === "flowerbed" ? bedFrame(e) : working ? Math.floor(time * (e.boost > 0 ? 16 : 8)) % frames : 0;
  const ox = (s.origin || [0, 0])[0], oy = (s.origin || [0, 0])[1];
  const fw = s.frame[0], fh = s.frame[1], X = e.x * T - ox, Y = e.y * T - oy;
  if (i) ctx.drawImage(i, f * fw, 0, fw, fh, X, Y, fw, fh);
  if (ui.sel === e.id) { ctx.strokeStyle = "#ffd65a"; ctx.lineWidth = 1; const f2 = fp(e); ctx.strokeRect(e.x * T + 0.5, e.y * T + 0.5, f2.w * T - 1, f2.h * T - 1); }
  if (e.kind === "flowerbed" && e.planted) { if (e.grown >= FLOWER_TIME) { if (Math.floor(time * 2) % 2) drawIcon("etoile", X + fw / 2 - 8, Y - 18); } else bar(X + fw / 2 - 12, Y - 5, 24, e.grown / FLOWER_TIME, "#ff9ad5"); }
  if (e.kind === "machine" && unlinked(e).length && Math.floor(time * 2) % 2) drawIcon("non", X + fw / 2 - 8, Y - 18); // alerte : chaîne coupée
  if (e.kind === "machine") {
    if (e.craft) bar(X + fw / 2 - 12, Y - 5, 24, e.craft.t / e.craft.dur, e.stalled ? "#d8382f" : e.boost > 0 ? "#f6c445" : "#6cc46a");
    if (e.stalled) drawIcon("eclair", X + fw / 2 - 8, Y - 24);
    const outs = Object.keys(e.outb);
    if (outs.length) { drawItem(outs[0], X + fw - 14, Y + 2); text(String(outTotal(e)), X + fw + 2, Y + 18, "#ffffff"); }
  }
  if (e.kind === "source") {
    const r = RAW[e.gives];
    bar(e.x * T + 4, e.y * T - 4, 24, e.stock / r.cap, e.stock >= 1 ? "#3d8be0" : "#d8382f");
    if (e.stock > r.cap) text("+" + Math.floor(e.stock - r.cap), e.x * T + 16, e.y * T - 7, "#9ad8ff");
    if (e.chute) drawIcon("tapis", e.x * T + 8, e.y * T + 20);
  }
  if (e.kind === "crank") bar(e.x * T + 4, Y - 5, 24, e.reserve / CRANK_MAX, e.reserve > 10 ? "#9ad8ff" : "#d8382f");
  if (e.kind === "extractor") text(fmtN(e.rate) + "/s", e.x * T + 16, e.y * T + 30, "#9ad8ff");
  if (e.kind === "chest") { const n = Object.values(e.store).reduce((a, b) => a + b, 0); if (n) text(String(n), e.x * T + 26, e.y * T, "#ffffff"); }
}
function draw(time) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#1b120d"; ctx.fillRect(0, 0, cv.width, cv.height);
  const s = zoom * dpr, vw = cssW / zoom, vh = cssH / zoom, p = S.player;
  const fx = p.px * T + 16, fy = p.py * T + 16;
  if (!camReady) { cam.x = fx - vw / 2; cam.y = fy - vh / 2; camReady = true; }
  const l = cam.x + vw * (0.5 - DEAD_W / 2), r = cam.x + vw * (0.5 + DEAD_W / 2), t = cam.y + vh * (0.5 - DEAD_H / 2), b = cam.y + vh * (0.5 + DEAD_H / 2);
  if (fx < l) cam.x -= l - fx; else if (fx > r) cam.x += fx - r;
  if (fy < t) cam.y -= t - fy; else if (fy > b) cam.y += fy - b;
  const AW = S.area.w * T, AH = S.area.h * T;
  cam.x = AW <= vw ? (AW - vw) / 2 : Math.max(0, Math.min(AW - vw, cam.x));
  cam.y = AH <= vh ? (AH - vh) / 2 : Math.max(0, Math.min(AH - vh + 60, cam.y));
  ctx.setTransform(s, 0, 0, s, Math.round(-cam.x * s), Math.round(-cam.y * s));
  ctx.imageSmoothingEnabled = false;
  const st = S.stage, wall = stageImg(st, TILESET[st][1] + ".png"), floor = stageImg(st, TILESET[st][0] + ".png");
  for (let x = 0; x < S.area.w; x++) {
    if (wall) ctx.drawImage(wall, (hash(x, 0) % 7 === 0 ? 1 : hash(x, 1) % 9 === 0 ? 2 : 0) * 32, 0, 32, 64, x * T, 0, 32, 64);
    for (let y = Y0; y < S.area.h; y++) if (floor) { const h = hash(x, y) % 10, n = floor.width / 32; const v = n === 2 ? (h < 8 ? 0 : 1) : st === 5 ? 0 : (h < 7 ? 0 : h < 9 ? 1 : 2); ctx.drawImage(floor, v * 32, 0, 32, 32, x * T, y * T, 32, 32); }
  }
  // portée du personnage
  if (ui.mode === "hand") { ctx.fillStyle = "rgba(255,240,160,.05)"; ctx.fillRect((p.x - RANGE) * T, (p.y - RANGE) * T, (2 * RANGE + 1) * T, (2 * RANGE + 1) * T); }
  for (const e of S.ents) if (e.kind === "rug") drawEnt(e, time);
  const belt = img("usine/tapis/bois.png"), held = ui.place?.belt && S.belts[ui.place.belt], bl = Object.values(S.belts).filter((b) => b !== held);
  for (const b of bl) { const bi = img(`usine/tapis/${b.k || "bois"}.png`); if (bi) ctx.drawImage(bi, (b.on ? Math.floor(time * 6 * BELT_SPEED[b.k || "bois"] / 0.5) % 4 : 0) * 32, BELT_ROWS.indexOf(beltRow(b)) * 32, 32, 32, b.x * T, b.y * T, 32, 32); }
  for (const b of bl) for (let l = 0; l < 2; l++) for (const o of b.lanes[l]) { const [x, y] = beltPos(b, l, o.p); drawItem(o.it, x - 8, y - 11); }
  for (const b of bl) {
    if (!b.on) drawIcon("eclair", b.x * T + 8, b.y * T + 6);
    else if (b.bt && (b.bt[0] > 4 || b.bt[1] > 4) && Math.floor(time * 2) % 2) drawIcon("non", b.x * T + 8, b.y * T + 6);   // voie bloquée depuis plus de 4 s
  }
  const list = [];
  for (const e of S.ents) if (e.kind !== "rug" && e.id !== ui.place?.id) list.push([(e.y + fp(e).h) * T - 1, () => drawEnt(e, time)]);
  list.push([p.py * T + T, () => drawPlayer(time)]);
  list.sort((a, b) => a[0] - b[0]); for (const [, fn] of list) fn();
  // câbles : arbre couvrant des poteaux (chaque poteau relié au plus proche déjà relié), plus le générateur
  const poles = S.ents.filter((e) => e.kind === "pole"), gen = S.ents.find((e) => e.kind === "generator");
  if (poles.length) {
    const top = (e) => e.kind === "pole" ? [e.x * T + 16, e.y * T - 30] : [e.x * T + 20, e.y * T - 20];
    const done = [gen || poles[0]], left = poles.filter((p) => p !== done[0]), edges = [];
    while (left.length) {
      let best = null;
      for (const a of done) for (const b of left) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (!best || d < best[0]) best = [d, a, b]; }
      edges.push([best[1], best[2]]); done.push(best[2]); left.splice(left.indexOf(best[2]), 1);
    }
    ctx.strokeStyle = "#1c1820"; ctx.lineWidth = 1;
    for (const [a, b] of edges) {
      const [ax, ay] = top(a), [bx, by] = top(b);
      ctx.beginPath(); ctx.moveTo(ax + 0.5, ay + 0.5); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 10, bx + 0.5, by + 0.5); ctx.stroke();
    }
  }
  if (ui.hover && ui.mode === "build" && ui.build) {
    const [hx, hy] = ui.hover, key = ui.build, ok = canPlace(key, ROT[ui.rot], hx, hy) && S.coins >= (key === "belt" ? BELT_COST[ui.beltK || "bois"] : costOf(key));
    ctx.globalAlpha = 0.6;
    if (key === "belt") { const bi = img(`usine/tapis/${ui.beltK || "bois"}.png`); if (bi) ctx.drawImage(bi, 0, BELT_ROWS.indexOf(BROT[ui.rot]) * 32, 32, 32, hx * T, hy * T, 32, 32); }
    else { const sp = sprOf(key, stageOf(key), ROT[ui.rot]), i = stageImg(stageOf(key), sp.file); if (i) ctx.drawImage(i, 0, 0, sp.frame[0], sp.frame[1], hx * T - sp.origin[0], hy * T - sp.origin[1], sp.frame[0], sp.frame[1]); }
    ctx.globalAlpha = 1;
    const f = key === "belt" ? [1, 1] : sprOf(key, stageOf(key), ROT[ui.rot]).footprint;
    ctx.strokeStyle = ok ? "#6cc46a" : "#d8382f"; ctx.lineWidth = 1; ctx.strokeRect(hx * T + 0.5, hy * T + 0.5, f[0] * T - 1, f[1] * T - 1);
    if (key === "crank") { ctx.strokeStyle = "rgba(154,216,255,.6)"; ctx.setLineDash([3, 3]); ctx.strokeRect((hx - CRANK_R) * T, (hy - CRANK_R) * T, (2 * CRANK_R + 1) * T, (2 * CRANK_R + 1) * T); ctx.setLineDash([]); }
    if (MACH[key] && MACH[key].power) {
      const pt = portsOf({ name:key, stage:stageOf(key), o:ROT[ui.rot], x:hx, y:hy });
      if (pt) { text("entrée", pt.in.outside[0] * T + 16, pt.in.outside[1] * T + 18, "#9ad8ff"); text("sortie", pt.out.outside[0] * T + 16, pt.out.outside[1] * T + 18, "#ffd65a"); }
    }
  }
  if (ui.place?.belt) { // fantôme du tapis qu'on déplace
    const q = ui.place, b = S.belts[q.belt], bi = img(`usine/tapis/${b.k || "bois"}.png`), ok = placeOk();
    ctx.globalAlpha = 0.75; if (bi) ctx.drawImage(bi, 0, BELT_ROWS.indexOf(q.o) * 32, 32, 32, q.x * T, q.y * T, 32, 32); ctx.globalAlpha = 1;
    ctx.strokeStyle = ok ? "#6cc46a" : "#d8382f"; ctx.lineWidth = 1; ctx.strokeRect(q.x * T + 0.5, q.y * T + 0.5, T - 1, T - 1);
  } else if (ui.place) { // fantôme de l'objet qu'on pose
    const q = ui.place, sp = sprOf(q.key, q.stage, q.o), i = stageImg(q.stage, sp.file), f = sp.footprint || [1, 1], ok = placeOk();
    ctx.globalAlpha = 0.75;
    if (i) ctx.drawImage(i, 0, 0, sp.frame[0], sp.frame[1], q.x * T - (sp.origin || [0, 0])[0], q.y * T - (sp.origin || [0, 0])[1], sp.frame[0], sp.frame[1]);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ok ? "#6cc46a" : "#d8382f"; ctx.lineWidth = 1; ctx.strokeRect(q.x * T + 0.5, q.y * T + 0.5, f[0] * T - 1, f[1] * T - 1);
  }
  if (ui.hover && ui.mode === "demolish") { ctx.strokeStyle = "#d8382f"; ctx.strokeRect(ui.hover[0] * T + 0.5, ui.hover[1] * T + 0.5, T - 1, T - 1); }
  if (ui.target) { const [tx, ty] = ui.target; ctx.strokeStyle = "rgba(255,214,90,.7)"; ctx.strokeRect(tx * T + 8.5, ty * T + 8.5, 15, 15); }
  for (const f of fxs) { ctx.globalAlpha = 1 - f.t / 1.2; text(f.text, f.x, f.y - f.t * 18, f.color); ctx.globalAlpha = 1; }
}

// ---------------------------------------------------------------- entrées
const ui = { mode:"hand", build:null, rot:0, sel:null, hover:null, target:null, dirty:true, tab:"commandes", drag:null, hold:null, holdT:0, harvest:0 };
function tileAt(ev) {
  const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / zoom + cam.x, y = (ev.clientY - r.top) / zoom + cam.y;
  return [Math.floor(x / T), Math.floor(y / T)];
}
cv.addEventListener("pointermove", (ev) => {
  const [x, y] = tileAt(ev); ui.hover = [x, y];
  // appui long : un mouvement l'annule (c'était un glissé)
  if (ui.press && !ui.press.fired && Math.hypot(ev.clientX - ui.press.x, ev.clientY - ui.press.y) > 8) { clearTimeout(ui.press.timer); ui.press = null; }
  if (ui.follow) { ui.follow.cx = ev.clientX; ui.follow.cy = ev.clientY; }
  if (ui.place && ui.placeDrag) { ui.place.x = x - ui.placeDrag[0]; ui.place.y = y - ui.placeDrag[1]; ui.dirty = true; return; }
  if (ui.drag && ui.mode === "build" && ui.build === "belt") {
    const [px, py] = ui.drag;
    if (x !== px || y !== py) {
      const d = Math.abs(x - px) >= Math.abs(y - py) ? (x > px ? "E" : "W") : (y > py ? "S" : "N");
      ui.rot = BROT.indexOf(d);
      const pb = S.belts[px + "," + py]; if (pb) pb.d = d;
      const nx = px + DIRS[d][0], ny = py + DIRS[d][1];
      place("belt", ui.rot, nx, ny); ui.drag = [nx, ny];
    }
  }
});
cv.addEventListener("pointerleave", () => { ui.hover = null; });
const release = () => {
  ui.drag = null; ui.hold = null; ui.placeDrag = null; ui.follow = null;
  // appui court sur un objet déplaçable : son menu s'ouvre au relâché (un appui long l'a pris en main à la place)
  const p = ui.press; ui.press = null;
  if (p && !p.fired) { clearTimeout(p.timer); const e = byId(p.id); if (e) reach(e); }
};
cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);
cv.addEventListener("contextmenu", (ev) => ev.preventDefault());
cv.addEventListener("pointerdown", (ev) => {
  if (S.visit) return closePanel(); // en visite : on regarde seulement
  const [x, y] = tileAt(ev); ui.hover = [x, y];
  try { cv.setPointerCapture(ev.pointerId); } catch {}
  if (ui.mode === "build" && ui.build) {
    if (place(ui.build, ui.rot, x, y) && ui.build === "belt") ui.drag = [x, y];
    ui.dirty = true; return;
  }
  if (ui.mode === "demolish") { demolish(x, y); ui.dirty = true; return; }
  if (ui.place) { // on fait glisser le fantôme (en le saisissant, ou en touchant ailleurs pour l'y amener)
    const q = ui.place, f = footOf(q);
    if (x < q.x || y < q.y || x >= q.x + f[0] || y >= q.y + f[1]) { q.x = x; q.y = y; }
    ui.placeDrag = [x - q.x, y - q.y]; ui.dirty = true; return;
  }
  const e = entAt(x, y), p = S.player;
  ui.pending = null; closePanel(); // toucher le jeu referme le volet (téléphone) ; toucher une machine le rouvre sur elle
  if (ui.mode === "inspect") { if (e) select(e); return; }
  if (e && MOVABLE.includes(e.kind)) {
    // appui long : on le prend en main pour le déplacer ; appui court (au relâché) : on va à côté, on agit, sa fiche s'ouvre
    ui.press = { id:e.id, x:ev.clientX, y:ev.clientY, fired:false, timer:setTimeout(() => { if (ui.press) { ui.press.fired = true; startMove(e); } }, 420) };
  } else if (e) { ui.hold = e.id; ui.holdT = 0.35; ui.harvest = 0; ui.target = null; interact(e, true); select(e, e.kind === "source"); }
  else { const path = bfs(p.x, p.y, (a, b) => a === x && b === y); if (path) { p.path = path; p.job = null; p.menu = null; p.harvest = null; ui.target = [x, y]; } ui.follow = { cx:ev.clientX, cy:ev.clientY, t:0.15 };
    const b = S.belts[x + "," + y];
    if (b) ui.press = { x:ev.clientX, y:ev.clientY, fired:false, timer:setTimeout(() => { if (ui.press) { ui.press.fired = true; startMoveBelt(b); } }, 420) };
  }
  ui.dirty = true;
});
window.addEventListener("keydown", (ev) => {
  if (ev.target.tagName === "SELECT" || ev.target.tagName === "INPUT") return;
  if (ev.key === "r" || ev.key === "R") { if (ui.place) rotatePlace(); else { ui.rot = (ui.rot + 1) % 4; ui.dirty = true; } }
  if (ui.place && ev.key === "Enter") confirmPlace();
  if (ui.place && ev.key === "Escape") return cancelPlace();
  if (ev.key === "Escape") setMode("hand");
  const k = { "1":"hand", "2":"build", "3":"inspect", "4":"demolish" }[ev.key]; if (k) setMode(k);
});

// ---------------------------------------------------------------- interface (pixel art)
const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString("fr-FR");
const fmtN = (n) => (Math.round(n * 10) / 10).toLocaleString("fr-FR");
const itemHTML = (it, n) => `<span class="it" style="--i:${ITEMS.indexOf(iconOf(it))}" title="${label(it)}"></span>${n != null ? `<b class="n">${n}</b>` : ""}`;
const icon = (name) => `<span class="ic" style="--i:${ICONS.indexOf(name)}"></span>`;
// Volet du panneau sur téléphone (sans effet sur grand écran, où le panneau est toujours visible).
// Téléphone : ☰ montre la rangée d'icônes (outils, zoom, pages) ; une icône de page ouvre son volet en bas.
// Sans effet sur grand écran, où tout est toujours visible.
function openPanel() { document.body.classList.add("panel"); }
function closePanel() { document.body.classList.remove("panel"); }
function togglePanel(tab) {
  if (S.visit && tab !== "visiter") return toast("Tu visites une usine : reviens chez toi pour jouer.");
  if (tab === "visiter") loadMembers(); if (document.body.classList.contains("panel") && ui.tab === tab) closePanel(); else { ui.tab = tab; openPanel(); } ui.dirty = true; }
function toggleIcons() { const on = !document.body.classList.contains("menu"); document.body.classList.toggle("menu", on); $("menubtn").textContent = on ? "✕" : "☰"; if (!on) closePanel(); }
function select(e, quiet) { ui.sel = e.id; if (!quiet || ui.tab === "selection") ui.tab = "selection"; if (!quiet) openPanel(); ui.dirty = true; }
function setMode(m) { ui.mode = m; if (m !== "build") ui.build = null; if (m === "build") { ui.tab = "construire"; openPanel(); } else closePanel(); ui.dirty = true; }
let toastT = 0;
function toast(msg, ms = 3500) { const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms); }
const fmtTime = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}`; };
function gauge(frac, color = "vert") { return `<div class="gauge"><i class="g-${color}" style="width:${Math.round(100 * Math.max(0, Math.min(1, frac)))}%"></i></div>`; }
/** Met `el` à jour vers `html` en ne modifiant que ce qui diffère (textes, attributs, éléments ajoutés ou retirés). */
function morph(el, html) { const t = document.createElement("div"); t.innerHTML = html; patch(el, t); }
function patch(a, b) {
  const an = [...a.childNodes], bn = [...b.childNodes];
  bn.forEach((y, i) => {
    const x = an[i];
    if (!x) return a.appendChild(y.cloneNode(true));
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName || (x.id || "") !== (y.id || "")) return a.replaceChild(y.cloneNode(true), x);
    if (x.nodeType === 3) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; return; }
    if (x.nodeType !== 1) return;
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
    for (const at of [...y.attributes]) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
    patch(x, y);
  });
  for (let i = an.length - 1; i >= bn.length; i--) a.removeChild(an[i]);
}
function renderUI() {
  $("coins").textContent = fmt(S.coins); $("stars").textContent = fmt(S.stars);
  $("stage").textContent = `Étape ${S.stage} · ${STAGE_NAMES[S.stage]}`;
  for (const b of document.querySelectorAll("[data-mode]")) b.classList.toggle("on", b.dataset.mode === ui.mode);
  for (const b of document.querySelectorAll("[data-tab]")) b.classList.toggle("on", b.dataset.tab === ui.tab);
  const panel = document.body.classList.contains("panel");
  for (const b of document.querySelectorAll("[data-page]")) b.classList.toggle("on", panel && b.dataset.page === ui.tab);
  const q = ui.place;
  $("placebar").hidden = !q;
  if (q) { $("prot").hidden = !q.o || q.key.startsWith("extractor"); $("pdel").hidden = !(q.belt || (q.id && !["source", "crate", "deco", "rug"].includes(byId(q.id)?.kind))); /* ce qui se démonte */ $("pok").disabled = !placeOk(); const ok = q.cost ? `✓ ${icon("piece")}${fmt(q.cost)}` : "✓ Poser"; if ($("pok").dataset.h !== ok) { $("pok").innerHTML = ok; $("pok").dataset.h = ok; } }
  $("beltdone").hidden = !(ui.mode === "build" && ui.build === "belt");
  // sac
  let bag = "";
  for (let i = 0; i < BAG; i++) { const s = S.bag[i]; bag += `<div class="slot">${s ? itemHTML(s.it, s.n) : ""}</div>`; }
  if ($("bag").dataset.h !== bag) { morph($("bag"), bag); $("bag").dataset.h = bag; }
  let h = "";
  if (ui.tab === "commandes") {
    h += `<h3>${icon("piece")} Commandes du jour</h3><p class="muted">Payées en pièces de la salle.</p>`;
    dailyOrders().forEach((o, i) => {
      const have = haveFor(o.key);
      h += `<div class="card"><div class="row">${itemHTML(iconOf(o.key))}<span>${label(o.key)} × ${o.n}</span><span class="grow"></span>${o.done ? `<span>${icon("ok")} Livrée</span>`
        : `<button class="btn sm ${have >= o.n ? "vert" : ""}" data-order="${i}" ${have < o.n || o.sending ? "disabled" : ""}>Livrer · +${fmt(ORDER_PAY[i])}</button>`}</div>${o.done ? "" : gauge(have / o.n, have >= o.n ? "vert" : "or")}</div>`;
    });
    h += `<h3>${icon("commandes")} Contrats</h3><p class="muted">À livrer à la caisse. ×1,5 étoiles en moins de 7 min.</p>`;
    for (const c of S.contracts) {
      const left = c.dl - (S.time - c.t0), fast = S.time - c.t0 < c.bonus_s;
      h += `<div class="card"><div class="row">${itemHTML(c.key)}<span>${label(c.key)}</span><span class="grow"></span><b>${c.got} / ${c.n}</b></div>${gauge(c.got / c.n)}
        <div class="row muted">${icon("etoile")}<span>${c.stars}${fast ? " ×1,5" : ""}</span>${icon("piece")}<span>${c.pay}</span><span class="grow"></span>${icon("horloge")}<span>${fmtTime(left)}</span></div></div>`;
    }
    h += `<h3>Ventes</h3><div class="wrap">${Object.entries(S.stats).filter(([it]) => price(it) > 0).map(([it, n]) => `<span class="chip">${itemHTML(it, fmt(n))}</span>`).join("") || '<span class="muted">Rien vendu pour l’instant.</span>'}</div>`;
  }
  if (ui.tab === "marche") {
    h += `<h3>${icon("marche")} Marché</h3><p class="muted">Remplis un tas plus vite (200 au plus).</p>`;
    for (const s of S.ents.filter((e) => e.kind === "source")) {
      const r = RAW[s.gives];
      h += `<div class="card"><div class="row">${itemHTML(s.gives)}<span>${label(s.gives)}</span><span class="grow"></span><span class="muted">${Math.floor(s.stock)} / ${r.cap} · +${fmtN(r.refill)}/s</span></div>
        <div class="row"><span class="muted">${fmtN(r.cost)} p l'unité</span><span class="grow"></span>${[1, 10, 50].map((n) => `<button class="btn sm" data-buy="${s.gives}" data-n="${n}" ${S.coins < n * r.cost ? "disabled" : ""}>×${n}</button>`).join("")}</div></div>`;
    }
  }
  if (ui.tab === "commandes" || ui.tab === "progression") { // progression : sous les commandes
    const g = gateStatus();
    h += `<h3>${icon("progression")} Étape ${S.stage} · ${STAGE_NAMES[S.stage]}</h3>`;
    if (g) {
      h += `<p>Pour passer à l'étape ${S.stage + 1} (${STAGE_NAMES[S.stage + 1]}) :</p>`;
      for (const p of g.parts) h += `<div class="card"><div class="row">${icon(p.ok ? "ok" : "cadenas")}<span>${p.text}</span></div>${gauge(p.frac, p.ok ? "vert" : "or")}</div>`;
      h += `<p class="muted">Débloque : ${UNLOCK_TEXT[S.stage + 1]}</p><button class="btn vert wide" id="advance" ${g.ok ? "" : "disabled"}>Passer à l'étape ${S.stage + 1}</button>`;
    } else h += `<p>${icon("etoile")} Étape 6 : à la prochaine mise à jour !</p>`;
  }
  if (ui.tab === "visiter") {
    h += `<h3>${icon("maison")} Visiter une usine</h3>`;
    if (S.visit) h += `<p>Tu es chez ${S.visit}.</p><button class="btn or wide" id="visitback2">Revenir à mon usine</button>`;
    const ms = ui.members;
    h += !ms ? `<p class="muted">Chargement…</p>` : !ms.length ? `<p class="muted">Personne d'autre dans la salle.</p>`
      : ms.map((m) => `<div class="card"><div class="row"><span>${m.name.replace(/</g, "&lt;")}</span><span class="grow"></span><span class="muted">${m.stage ? "étape " + m.stage : "pas d'usine"}</span>${m.stage ? `<button class="btn sm" data-visit="${m.id}" data-name="${m.name.replace(/"/g, "&quot;")}">Visiter</button>` : ""}</div></div>`).join("");
  }
  if (ui.tab === "construire") {
    h += `<h3>${icon("marteau")} Construire</h3><div class="grid">`;
    for (let s = 1; s <= 5; s++) for (const [key] of BUILD[s]) {
      if (UPGRADED.has(key)) continue; // s'obtient en améliorant une machine
      const lock = s > S.stage, cost = costOf(key);
      let pic;
      if (key.startsWith("belt")) pic = `<span class="pic" style="background-image:url(usine/tapis/${key.split("_")[1] || "bois"}.png);width:32px;height:32px"></span>`;
      else { const sp = sprOf(key, stageOf(key), hasOri(key) || key.startsWith("extractor") ? "e" : undefined); pic = `<span class="pic" style="background-image:url(usine/etape-${stageOf(key)}/${sp.file});width:${sp.frame[0]}px;height:${sp.frame[1]}px;transform:scale(${Math.min(1, 56 / sp.frame[1])})"></span>`; }
      h += `<button class="btn tile ${ui.build === key ? "on" : ""}" data-build="${key}" ${lock ? "disabled" : ""}><span class="picbox">${pic}</span><span>${nameOf(key)}</span><small>${lock ? "étape " + s : icon("piece") + fmt(cost)}</small></button>`;
    }
    h += `</div>`;
    const n = nextExpand();
    h += `<h3>${icon("maison")} Atelier · ${S.area.w} × ${S.area.h - Y0} cases</h3>`;
    h += n ? `<button class="btn or wide" id="expand" ${S.coins < n[2] ? "disabled" : ""}>Agrandir : ${n[0]} × ${n[1] - Y0} · ${icon("piece")}${fmt(n[2])}</button>` : `<p class="muted">L'atelier a sa taille maximale.</p>`;
  }
  if (ui.tab === "selection") {
    const e = byId(ui.sel);
    if (!e) h += `<p class="muted">Touche un objet.</p>`;
    else if (e.kind === "machine") {
      const info = MACH[e.name], recs = RECIPES[e.name];
      h += `<h3>${info.name}</h3><p class="muted">Étape ${info.stage} · vitesse ×${String(SPEED[info.stage]).replace(".", ",")}</p>`;
      if (e.stalled) h += `<p class="bad">${icon("eclair")} Sans énergie</p>`;
      if (unlinked(e).length) h += `<p class="bad">${icon("non")} Pas de tapis relié : ${unlinked(e).join(", ")}</p>`;
      if (manual(e)) {
        // D'abord ce qu'on peut fabriquer maintenant (avec la machine et le sac), puis, plus bas, toutes les recettes.
        const q = e.queue || [], room = QUEUE_MAX - q.length;
        const line = (r) => `${Object.entries(r.in).map(([k, n]) => itemHTML(k, n)).join("")}<span class="arrow">→</span>${Object.entries(r.out).map(([k, n]) => itemHTML(k, n < 1 ? "~" : n)).join("")}`;
        const can = recs.map((r) => [r, possible(e, r)]).filter(([, n]) => n > 0);
        h += `<h3>${icon("marteau")} Fabriquer</h3>`;
        h += can.length ? `<div class="card">${can.map(([r, n]) => `<div class="rec ${e.craft && e.craft.id === r.id ? "on" : ""}">${line(r)}<span class="grow"></span><button class="btn sm" data-craft="${r.id}" data-n="1" ${room < 1 ? "disabled" : ""}>+1</button>${n > 1 ? `<button class="btn sm" data-craft="${r.id}" data-n="${Math.min(n, room)}" ${room < 1 ? "disabled" : ""}>×${Math.min(n, room)}</button>` : ""}</div>`).join("")}</div>`
          : `<p class="muted">Rien à fabriquer pour l'instant.</p>`;
        if (q.length) h += `<div class="row"><span class="muted">À faire (${q.length})</span>${q.slice(0, 8).map((id) => { const r = RECIPES[e.name].find((x) => x.id === id); return r ? itemHTML(Object.keys(r.out)[0]) : ""; }).join("")}${q.length > 8 ? "…" : ""}<span class="grow"></span><button class="btn sm rouge" id="clearq">Vider</button></div>`;
        h += `<h3>Recettes</h3><div class="card">${recs.map((r) => `<div class="rec">${line(r)}<small>${(r.t / SPEED[info.stage]).toFixed(1).replace(".", ",")} s</small></div>`).join("")}</div>`;
      } else {
      if (recs.length > 1) {
          h += `<label>Recette <select id="recipe"><option value="auto">Automatique</option>${recs.map((r) => `<option value="${r.id}" ${e.recipe === r.id ? "selected" : ""}>${r.name}</option>`).join("")}</select></label>`;
          if (recs.some((r) => r.color)) h += `<label>Couleur préférée <select id="color"><option value="">—</option>${COLORS.map((c) => `<option value="${c}" ${e.color === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>`;
        }
        h += `<div class="card">${activeRecipes(e).slice(0, 6).map((r) => `<div class="rec ${e.craft && e.craft.id === r.id ? "on" : ""}">${Object.entries(r.in).map(([k, n]) => itemHTML(k, n)).join("")}<span class="arrow">→</span>${Object.entries(r.out).map(([k, n]) => itemHTML(k, n < 1 ? "~" : n)).join("")}<small>${(r.t / SPEED[info.stage]).toFixed(1).replace(".", ",")} s</small></div>`).join("")}</div>`;
      }
      h += `<div class="row"><span class="muted">Dedans</span>${Object.entries(e.inb).map(([k, n]) => itemHTML(k, n)).join("") || '<span class="muted">vide</span>'}</div>`;
      h += `<div class="row"><span class="muted">Sorti</span>${Object.entries(e.outb).map(([k, n]) => itemHTML(k, n)).join("") || '<span class="muted">rien</span>'}</div>`;
      if (e.craft) h += gauge(e.craft.t / e.craft.dur, e.boost > 0 ? "or" : "vert");
      h += `<div class="row"><button class="btn" id="rotate">${icon("tourner")} Tourner</button><button class="btn rouge" id="demol">${icon("poubelle")} Démonter</button></div>`;
    } else if (e.kind === "source") {
      const r = RAW[e.gives];
      h += `<h3>${itemHTML(e.gives)} Tas de ${label(e.gives).toLowerCase()}</h3><p>${Math.floor(e.stock)} unités · se recharge de ${fmtN(r.refill)}/s jusqu'à ${r.cap}.</p>${gauge(Math.min(1, e.stock / r.cap), "bleu")}`;
      const room = Math.min(Math.floor(e.stock), bagRoom(e.gives));
      h += `<div class="row"><span class="muted">Prendre</span><span class="grow"></span>${[1, 5, 20].map((n) => `<button class="btn sm vert" data-take="${n}" ${room < 1 ? "disabled" : ""}>×${n}</button>`).join("")}</div>`;
      if (Math.floor(e.stock) >= 1 && !bagRoom(e.gives)) h += `<p class="muted">Sac plein : dépose dans un coffre ou une machine.</p>`;
      h += `<div class="row"><span class="muted">Acheter (${fmtN(r.cost)} p l'unité)</span><span class="grow"></span>${[1, 10, 50].map((n) => `<button class="btn sm" data-buy="${e.gives}" data-n="${n}">×${n}</button>`).join("")}</div>`;
      if (S.stage >= 3) h += e.chute ? `<p class="muted">${icon("tapis")} Goulotte posée.</p>`
        : `<button class="btn or wide" id="chute">${icon("tapis")} Poser une goulotte (${CHUTE_COST} p)</button>`;
    } else if (e.kind === "crank") {
      h += `<h3>Manivelle</h3><p>Réserve : ${Math.floor(e.reserve)} / ${CRANK_MAX} s. Touche-la pour la remonter.</p>${gauge(e.reserve / CRANK_MAX, "bleu")}<div class="row"><button class="btn rouge" id="demol">${icon("poubelle")} Démonter</button></div>`;
    } else if (e.kind === "chest") {
      const inBag = [...new Set(S.bag.filter(Boolean).map((sl) => sl.it))];
      h += `<h3>Coffre</h3><p class="muted">${chestTotal(e)} / 200 objets</p>`;
      h += `<h3>Dans le coffre</h3>`;
      h += Object.keys(e.store).length ? `<div class="card">${Object.entries(e.store).map(([k, n]) => `<div class="rec">${itemHTML(k, n)}<span>${label(k)}</span><span class="grow"></span>${[1, 10].filter((q) => q < n).map((q) => `<button class="btn sm" data-cget="${k}" data-n="${q}">×${q}</button>`).join("")}<button class="btn sm vert" data-cget="${k}" data-n="${n}">Tout</button></div>`).join("")}</div><button class="btn wide" id="cgetall">Tout prendre</button>`
        : `<p class="muted">Vide.</p>`;
      h += `<h3>Dans ton sac</h3>`;
      h += inBag.length ? `<div class="card">${inBag.map((k) => { const n = bagCount(k); return `<div class="rec">${itemHTML(k, n)}<span>${label(k)}</span><span class="grow"></span>${[1, 10].filter((q) => q < n).map((q) => `<button class="btn sm" data-cput="${k}" data-n="${q}">×${q}</button>`).join("")}<button class="btn sm or" data-cput="${k}" data-n="${n}">Tout</button></div>`; }).join("")}</div><button class="btn wide" id="cputall">Tout déposer</button>`
        : `<p class="muted">Ton sac est vide.</p>`;
    } else if (e.kind === "extractor") {
      h += `<h3>${itemHTML(e.gives)} Extracteur de ${label(e.gives).toLowerCase()}</h3><p>Pose ${fmtN(e.rate)} objet/s sur le tapis voisin, sur la voie de son côté. Demande un poteau électrique à ${POLE_R} cases.</p>`;
      h += `<div class="row"><span class="muted">Matière</span><span class="grow"></span>${Object.keys(RAW).filter((r) => RAW[r].stage <= S.stage).map((r) => `<button class="btn sm ${e.gives === r ? "on" : ""}" data-gives="${r}">${itemHTML(r)}</button>`).join("")}</div>`;
      if (!elecPowered(e)) h += `<p class="bad">${icon("eclair")} Pas de courant : il faut un poteau à ${POLE_R} cases et un générateur avec du bois.</p>`;
      h += `<div class="row"><span class="muted">Débit</span><span class="grow"></span>${[0.1, 0.25, 0.5, 1, 2].map((r) => `<button class="btn sm ${e.rate === r ? "on" : ""}" data-rate="${r}">${fmtN(r)}/s</button>`).join("")}</div>`;
    } else if (e.kind === "flowerbed") {
      h += `<h3>Serre de l'usine</h3><p class="muted">3 fleurs toutes les ${FLOWER_TIME / 3600} h, à replanter.</p>`;
      h += !e.planted ? `<p>Touche la serre pour planter.</p>` : e.grown >= FLOWER_TIME ? `<p>${icon("etoile")} En fleurs : touche-la pour récolter.</p>`
        : `<p class="muted">Prête dans ${fmtTime(FLOWER_TIME - e.grown)}.</p>${gauge(e.grown / FLOWER_TIME, "vert")}`;
      const have = (ui.flowers || []).filter((f) => f.qty > 0);
      h += `<h3>Tes fleurs · ${have.reduce((n, f) => n + f.qty, 0)}</h3>`;
      h += have.length ? `<div class="card">${have.map((f) => `<div class="row"><span>${f.name}</span><span class="grow"></span><b>× ${fmt(f.qty)}</b></div>`).join("")}</div>` : `<p class="muted">Aucune pour l'instant.</p>`;
    } else if (e.kind === "boiler" || e.kind === "generator") {
      const boil = e.kind === "boiler", cap = boil ? BOILER_N : GEN_N, burn = (e.load || 0) * FUEL_RATE[e.kind];
      h += `<h3>${boil ? "Chaudière" : "Générateur"}</h3>`;
      h += `<p class="muted">Brûle du bois.</p>`;
      h += `<div class="row">${itemHTML("bois")}<span>${Math.floor(e.fuel)} / ${FUEL_CAP}</span><span class="grow"></span><span class="muted">${fmtN(e.load || 0)} / ${cap} en marche</span></div>${gauge(e.fuel / FUEL_CAP, e.fuel < 3 ? "rouge" : "or")}`;
      if (burn > 0) h += `<p class="muted">Réserve pour ${fmtTime(e.fuel / burn)} (${fmtN(burn * 60)} bois/min).</p>`;
      if (e.fuel <= 0) h += `<p class="bad">${icon("eclair")} Plus de bois : tout est à l'arrêt.</p>`;
    } else if (e.kind === "pole") {
      h += `<h3>Poteau électrique</h3><p class="muted">Portée : ${POLE_R} cases.</p>`;
    } else h += `<h3>Caisse d'expédition</h3>`;
  }
  if (ui.tab === "selection") {
    const e = byId(ui.sel);
    if (e && e.kind === "deco") h += `<h3>Décoration</h3>`;
    if (e && e.kind === "machine" && UPGRADE[e.name]) {
      const t = UPGRADE[e.name], cost = costOf(t), st = MACH[t].stage;
      h += cost ? `<button class="btn or wide" id="upgrade" ${st > S.stage || S.coins < cost ? "disabled" : ""}>Améliorer : ${MACH[t].name} · ${st > S.stage ? "étape " + st : icon("piece") + fmt(cost)}</button>`
        : `<p class="muted">Prochaine amélioration : ${MACH[t].name} (étape ${st}).</p>`;
    }
  }
  const box = $("panel");
  if (box.dataset.h !== h) {
    morph(box, h); box.dataset.h = h;
  }
}
$("panel").addEventListener("click", (ev) => {
  const b = ev.target.closest("button");
  if (!b || b.disabled) return;
  const e = byId(ui.sel), d = b.dataset;
  if (d.build) { // tapis : on trace jusqu'à « Terminé » ; le reste se pose avec le fantôme
    if (d.build.startsWith("belt")) { ui.build = "belt"; ui.beltK = d.build.split("_")[1] || "bois"; ui.mode = "build"; closePanel(); } else startNew(d.build);
  }
  else if (d.buy) buy(d.buy, +d.n);
  else if (d.take && e && e.kind === "source") doNear(e, () => takeRaw(e, +d.take));
  else if (d.cget && e && e.kind === "chest") doNear(e, () => chestTake(e, d.cget, +d.n));
  else if (d.cput && e && e.kind === "chest") doNear(e, () => chestPut(e, d.cput, +d.n));
  else if (d.rate && e) e.rate = +d.rate;
  else if (d.order) deliverOrder(+d.order);
  else if (d.visit) visit(d.visit, d.name);
  else if (d.gives && e) { e.gives = d.gives; e.name = "extractor_" + (SRC_FILE[d.gives] || "source_" + d.gives).replace("source_", ""); }
  else if (d.craft && e) {
    const r = recipeOf(e, d.craft), n = r ? Math.min(+d.n, QUEUE_MAX - (e.queue ||= []).length, possible(e, r)) : 0;
    if (n > 0) { for (let k = 0; k < n; k++) e.queue.push(r.id); loadFor(e); }
    else if (r) toast("Pas assez de matériaux pour en demander plus.");
  }
  else ({
    advance, expand, visitback2:comeBack,
    rotate:() => e && rotateEnt(e), demol:() => e && demolish(e.x, e.y), upgrade:() => e && upgrade(e),
    clearq:() => { if (e) e.queue = []; },
    cgetall:() => e && doNear(e, () => { for (const it of Object.keys(e.store)) chestTake(e, it, e.store[it]); }),
    cputall:() => e && doNear(e, () => { for (const it of new Set(S.bag.filter(Boolean).map((sl) => sl.it))) chestPut(e, it, bagCount(it)); }),
    chute:() => { if (!e) return; if (S.coins < CHUTE_COST) return toast("Pas assez de pièces"); S.coins -= CHUTE_COST; e.chute = true; },
  })[b.id]?.();
  ui.dirty = true;
});
$("panel").addEventListener("change", (ev) => {
  const e = byId(ui.sel); if (!e) return;
  if (ev.target.id === "recipe") e.recipe = ev.target.value;
  if (ev.target.id === "color") e.color = ev.target.value || null;
  ui.dirty = true;
});
for (const b of document.querySelectorAll("[data-mode]")) b.addEventListener("click", () => setMode(b.dataset.mode));
for (const b of document.querySelectorAll("[data-tab]")) b.addEventListener("click", () => {
  if (S.visit && b.dataset.tab !== "visiter") return toast("Tu visites une usine : reviens chez toi pour jouer.");
  ui.tab = b.dataset.tab; if (ui.tab === "visiter") loadMembers(); ui.dirty = true;
});
$("menubtn").addEventListener("click", toggleIcons);
for (const b of document.querySelectorAll("[data-page]")) b.addEventListener("click", () => togglePanel(b.dataset.page));
$("menuclose").addEventListener("click", closePanel);
$("visitback").addEventListener("click", comeBack);
$("prot").addEventListener("click", rotatePlace);
$("pok").addEventListener("click", confirmPlace);
$("pno").addEventListener("click", cancelPlace);
$("pdel").addEventListener("click", removePlace);
$("beltdone").addEventListener("click", () => setMode("hand"));
$("zin").addEventListener("click", () => { zoom = ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)]; });
$("zout").addEventListener("click", () => { zoom = ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)]; });

/** Chacun a sa serre de l'usine (elle remplace la serre fermée) : on en offre une, fleur prête, si la partie n'en a pas. */
function ensureFlowerbed() {
  // l'ancienne serre provisoire (le petit sapin à fleurs roses) est remplacée par la vraie
  const old = S.ents.filter((e) => e.kind === "flowerbed" && e.name !== "serre_fleurs");
  if (old.length) { S.ents = S.ents.filter((e) => !old.includes(e)); invalidate(); }
  if (S.demo || S.ents.some((e) => e.kind === "flowerbed")) return;
  const p = S.player; let best = null;
  for (let y = Y0; y < S.area.h; y++) for (let x = 0; x < S.area.w; x++)
    if (fits("serre_fleurs", 1, undefined, x, y) && (!best || Math.hypot(x - p.x, y - p.y) < Math.hypot(best[0] - p.x, best[1] - p.y))) best = [x, y];
  if (best) addEnt({ kind:"flowerbed", name:"serre_fleurs", stage:1, x:best[0], y:best[1], planted:true, grown:FLOWER_TIME });
}
function useCharacter() {
  const q = new URLSearchParams(location.search), sp = q.get("sp");
  if (sp && SPECIES.includes(sp)) S.avatar = { species:sp, color:Math.max(0, Math.min(7, +q.get("co") || 0)), santa:true };
}
// ---------------------------------------------------------------- sauvegarde
function save() { if (S.demo || S.visit || catching) return; S.savedAt = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} }
/** Envoie la partie au serveur (sans effet hors d'une salle ou tant que la table n'existe pas). */
function push() {
  if (!API || S.demo || S.visit || catching) return;
  save(); const body = JSON.stringify(S);
  fetch(API, { method:"PUT", body, keepalive:body.length < 60000, headers:{ "content-type":"application/json" } }).catch(() => {});
}
/** Charge la partie du serveur si elle est plus récente que celle de l'appareil, puis rattrape le temps passé. */
async function pull() {
  if (API) try {
    const r = await fetch(API, { cache:"no-store" });
    if (r.ok) { const { state } = await r.json(); if (state && state.v === 2 && state.area && (state.savedAt || 0) > (S.savedAt || 0)) { S = state; useCharacter(); ensureFlowerbed(); invalidate(); camReady = false; ui.sel = null; ui.dirty = true; } }
  } catch {}
  catchUp();
}
// ---- Visiter l'usine d'un membre de la salle : on affiche sa partie (elle tourne), sans rien pouvoir y faire ni enregistrer.
let mine = null; // sa propre partie, gardée pendant une visite
async function loadMembers() {
  if (!API) return;
  try { const r = await fetch(API + "?list=1", { cache:"no-store" }); if (r.ok) { ui.members = (await r.json()).members; ui.dirty = true; } } catch {}
}
async function visit(id, name) {
  if (!API) return;
  try {
    const r = await fetch(`${API}?u=${encodeURIComponent(id)}`, { cache:"no-store" }), j = r.ok ? await r.json() : {};
    if (!j.state) return toast(`${name} n'a pas encore d'usine.`);
    if (!mine) { save(); mine = S; }
    S = j.state; S.visit = name; invalidate(); camReady = false; ui.sel = null; ui.place = null; closePanel();
    $("visitname").textContent = `Usine de ${name}`; $("visitbar").hidden = false; ui.dirty = true;
  } catch { toast("Visite impossible pour l'instant."); }
}
function comeBack() {
  if (!mine) return;
  S = mine; mine = null; invalidate(); camReady = false; ui.sel = null; $("visitbar").hidden = true; closePanel(); ui.dirty = true;
}
/** Tes fleurs (inventaire de la salle), pour la fiche de la serre. */
async function loadFlowers() {
  if (!API) return;
  try { const r = await fetch(API + "/fleur", { cache:"no-store" }); if (r.ok) { ui.flowers = (await r.json()).flowers; ui.dirty = true; } } catch {}
}
/** Image de la serre : 0 vide (à planter), 1 pousses, 2 plantes, 3 fleurs. */
const bedFrame = (e) => (!e.planted ? 0 : e.grown >= FLOWER_TIME ? 3 : e.grown >= FLOWER_TIME / 2 ? 2 : 1);
/** Cueille la fleur d'une serre de l'usine : le serveur la tire et l'ajoute à l'inventaire de la salle. */
async function pick(e) {
  if (!API) return toast("Ouvre l'usine depuis ta salle pour cueillir les fleurs.");
  if (e.picking) return; e.picking = true;
  try {
    const bed = S.ents.filter((b) => b.kind === "flowerbed").sort((a, b) => a.id - b.id).indexOf(e);
    const r = await fetch(API + "/fleur", { method:"POST", body:JSON.stringify({ bed }), headers:{ "content-type":"application/json" } }), j = await r.json();
    if (r.ok) { e.planted = false; e.grown = 0; ui.flowers = j.flowers; fx(e.x * T + 32, e.y * T, "✿ +" + j.picked.length, "#ff9ad5"); toast(`Récolte : ${j.picked.join(", ")} ! Replante pour la suite.`); push(); }
    else toast(j.error || "Cueillette impossible pour l'instant.");
  } catch { toast("Cueillette impossible pour l'instant."); }
  e.picking = false; ui.dirty = true;
}
// ---------------------------------------------------------------- l'usine tourne pendant l'absence
let catching = false;
/** Fait tourner l'usine pour le temps écoulé depuis la dernière sauvegarde, par paquets (l'écran reste réactif), puis résume. */
function catchUp() {
  if (S.demo || S.visit || catching || !S.savedAt) return;
  const away = Math.min(OFFLINE_MAX, (Date.now() - S.savedAt) / 1000);
  if (away < 30) return;
  catching = true;
  const box = $("catchup"), coins0 = S.coins, sold0 = S.sales.length, n = Math.round(away / OFF_DT);
  box.hidden = false;
  let i = 0;
  const chunk = () => {
    const end = Math.min(n, i + 4000);
    for (; i < end; i++) step(OFF_DT);
    $("catchbar").style.width = `${Math.round((100 * i) / n)}%`;
    if (i < n) return setTimeout(chunk, 0);
    box.hidden = true; catching = false; save(); push();
    const h = away >= 3600 ? `${Math.floor(away / 3600)} h ${String(Math.floor((away % 3600) / 60)).padStart(2, "0")}` : `${Math.floor(away / 60)} min`;
    const earned = S.coins - coins0;
    toast(earned > 0 ? `Pendant ton absence (${h}) : +${fmt(earned)} pièces.` : `Pendant ton absence (${h}) : l'usine n'a rien vendu. Pense à la vapeur ou à l'électricité !`, 7000);
    ui.dirty = true;
  };
  chunk();
}
// ---------------------------------------------------------------- démo : une usine électrique montée (étape 5)
// demoState : usine électrique montée, utilisée seulement par tools/usine-proto/check.mjs (mesure du rattrapage hors ligne).
function demoState() {
  newState(); S.demo = true; S.stage = 5; S.coins = 250000; S.earned = 250000; S.area = { w:W, h:H };
  S.ents = S.ents.filter((e) => e.kind === "deco" || e.kind === "chest" || e.kind === "crate"); invalidate();
  for (const e of S.ents) { if (e.kind === "crate") { e.x = 20; e.y = 7; } if (e.kind === "chest") { e.name = "chest_metal"; e.stage = 5; e.x = 20; e.y = 12; } if (e.kind === "deco") { e.x = 23; e.y = 16; } }
  const M = (name, x, y, extra) => addEnt({ kind:"machine", name, stage:5, x, y, o:"e", ...extra });
  const X = (gives, x, y, rate) => addEnt({ kind:"extractor", name:"extractor_" + gives, stage:5, x, y, o:"e", gives, rate, acc:0, lane:0 });
  const B = (x, y, d) => { S.belts[x + "," + y] = { x, y, d, k:"metal", lanes:[[], []], on:true }; };
  // ligne 1 : sable -> four à induction -> cabine de peinture (+ pigment) -> assembleur (+ fil) -> machine à couronnes (entrée du haut)
  X("sable", 0, 5, 0.9); B(1, 5, "E"); M("elec_furnace", 2, 5);
  B(4, 5, "E"); B(5, 5, "E"); X("pigment_rouge", 5, 6, 0.12); M("paint_booth", 6, 4, { color:"rouge" });
  B(8, 5, "E"); B(9, 5, "E"); X("fil", 9, 6, 0.12); M("assembler", 10, 4, { color:"rouge" });
  B(12, 5, "E"); B(13, 5, "E"); B(14, 5, "S"); B(14, 6, "E");
  // ligne 2 : pigment -> cabine (peinture seule) -> métier (+ fil) -> rubans, + branches -> machine à couronnes (entrée du bas)
  X("pigment_rouge", 0, 9, 0.03); B(1, 9, "E"); M("paint_booth", 2, 8, { recipe:"peinture_rouge" });
  B(4, 9, "E"); B(5, 9, "E"); X("fil", 5, 10, 0.2); M("elec_loom", 6, 9, { recipe:"ruban" });
  for (let x = 8; x <= 13; x++) B(x, 9, "E"); X("branche", 10, 10, 0.8);
  B(14, 9, "N"); B(14, 8, "N"); B(14, 7, "E");
  M("elec_wreath", 15, 6);
  B(17, 7, "E"); B(18, 7, "E"); B(19, 7, "E");
  // énergie
  addEnt({ kind:"generator", name:"generator", stage:5, x:21, y:14, o:"e", fuel:1e9, cap:99 }); // la démo : bois et puissance sans limite
  for (const [x, y] of [[4, 7], [9, 7], [13, 11], [17, 9], [19, 13], [4, 11]]) addEnt({ kind:"pole", name:"pole", stage:5, x, y });
  S.player = { x:12, y:11, px:12, py:11, path:[], dir:"up", work:0, job:null };
  S.contracts = []; for (let i = 0; i < 3; i++) newContract();
  for (let i = 0; i < 1800; i++) step(0.05);       // 90 s de mise en route : les tapis sont pleins à l'ouverture
}
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem("usine-proto-v2"); if (raw) { // reprend la partie d'avant les salles const s = JSON.parse(raw); if (s.v === 2 && s.area) { S = s; invalidate(); return; }
    if (s.v === 2) setTimeout(() => toast("Nouvelle version : l'atelier commence petit, la partie recommence.", 6000), 500); } } catch {}
  newState();
}
load(); useCharacter(); ensureFlowerbed();
setInterval(save, 4000); setInterval(push, 20000);
window.addEventListener("beforeunload", push);
// onglet caché : on enregistre ; de retour : l'usine rattrape le temps passé
document.addEventListener("visibilitychange", () => { if (document.hidden) push(); else catchUp(); });
pull();
new ResizeObserver(() => resize()).observe(cv.parentElement);
resize(); fitZoom();
if (S.time < 1) toast("Touche le tas de sable, puis le four.", 6000);
document.fonts?.load('8px "Chaumiere Pixel"');
requestAnimationFrame(tick);
window.__usine = { get S() { return S; }, step, place, advance, sell, interact, buy, byId, entAt, computePower, bagAdd };
})();
