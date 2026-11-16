// Usine de Noël — prototype v2 (étapes 1 à 3), sur le gameplay validé :
// tout à la main au début (tas de matières, sac, four et table), marché pour acheter, puis tapis à deux voies sans bras.
// Logique (état, recettes, tapis) séparée du rendu (canvas) et de l'interface (DOM), pour être portée en TypeScript dans Chaumière.
(() => {
"use strict";
const META = window.USINE_META;
// Objets sans fiche de sprites dans meta.js : l'aiguilleur (dessin à part), la carrière (le dessin du tas, pour la poser)
META["3"].objects.aiguilleur ||= { file:"aiguilleur.png", frame:[32, 32], frames:1, footprint:[1, 1], origin:[0, 0] };
META["3"].objects.quarry ||= META["3"].objects.source_sable;
META["1"].objects.poubelle ||= { file:"poubelle.png", frame:[32, 32], frames:1, footprint:[1, 1], origin:[0, 0] };
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
  "etoile_bois","etoile_doree","ruban","guirlande","couronne","sapin_decore","cadeau","piece","couronne_deco"];
const NAMES = { sable:"Sable", bois:"Bois", branche:"Branches", fil:"Fil", sapin_brut:"Sapin brut", verre:"Verre", perles:"Perles",
  eclats:"Éclats", planche:"Planche", sciure:"Sciure", crochet:"Crochet", boule_transparente:"Boule transparente",
  etoile_bois:"Étoile en bois", etoile_doree:"Étoile dorée", ruban:"Ruban", guirlande:"Guirlande", couronne:"Couronne", couronne_deco:"Couronne décorée", sapin_decore:"Sapin décoré" };
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
const PRICE = { boule_transparente:1, boule_peinte:3, etoile_bois:2, boule_finie:5, etoile_doree:6, guirlande:11, couronne:15, couronne_deco:26, sapin_decore:56, ruban:2 };
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
// Les planches ne donnent plus de sciure : ce déchet ne se vendait pas et ne servait à rien, il remplissait le sac et bloquait les tapis.
// (« sciure » reste dans ITEMS : la liste donne aussi la place de chaque icône dans objets_16x16.png.)
const PLANCHE = { id:"planche", name:"Planches", in:{ bois:2 }, out:{ planche:2 }, t:2 };
/** Objets qui n'existent plus (la sciure) : retirés des vieilles parties, partout où ils traînent. */
const GONE = ["sciure"];
function dropGone(st) {
  if (!st) return;
  const clean = (box) => { if (box) for (const it of GONE) delete box[it]; };
  st.bag = (st.bag || []).map((sl) => (sl && GONE.includes(sl.it) ? null : sl));
  for (const e of st.ents || []) { clean(e.inb); clean(e.outb); clean(e.res); clean(e.store); }
  for (const b of Object.values(st.belts || {})) b.lanes = (b.lanes || [[], []]).map((L) => L.filter((o) => !GONE.includes(o.it)));
  // et les machines automatiques restées en « automatique » prennent leur recette par défaut (c'est ce qu'elles faisaient)
  for (const e of st.ents || []) if (e.kind === "machine" && MACH[e.name]?.power && (e.recipe === "auto" || !e.recipe)) e.recipe = defaultRecipe(e.name);
  // et l'ancien réglage de sortie d'une goulotte (un seul côté, une voie) devient le nouveau (côté par côté)
  for (const e of st.ents || []) if (e.out) { e.outs = { [e.out]:e.lanePick == null ? "b" : e.lanePick }; delete e.out; delete e.lanePick; }
}
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
  wreath_table_belt:[{ id:"couronne_deco", name:"Couronne décorée", in:{ branche:4, ruban:1, "@boule_finie":2 }, out:{ couronne_deco:1 }, t:4 }],
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
const QUARRY_COST = 2500;   // la première ; chaque carrière déjà posée rend la suivante 1,5 fois plus chère
const quarryCost = () => Math.round(QUARRY_COST * 1.5 ** S.ents.filter((e) => e.quarry).length / 5) * 5;
/** Une seule carrière à sapins : c'est la matière la plus rentable, en multiplier les tas emballait toute l'économie. */
const sapinQuarryTaken = (self) => S.ents.some((e) => e.quarry && e !== self && e.gives === "sapin_brut");
const SWITCH_FILTERS = ["sable", "bois", "fil", "branche", "sapin_brut", "pigment_rouge", "pigment_vert", "pigment_or", "pigment_bleu",
  "verre", "perles", "planche", "crochet", "boule_transparente", "@peinture", "@boule_peinte", "@boule_finie", "etoile_bois", "etoile_doree", "ruban", "guirlande", "couronne", "couronne_deco", "sapin_decore"];

const BUILD = {   // [clé, coût, nom affiché si ce n'est pas une machine]
  1:[["kiln", 180], ["paint_table", 180], ["chest_wood", 60, "Coffre"], ["poubelle", 20, "Poubelle"], ["serre_fleurs", 300, "Serre de l'usine"]],
  2:[["wreath_table", 400], ["lathe", 830], ["tree_bench", 830], ["kiln_bellows", 830]],
  3:[["belt", 5, "Tapis en bois"], ["aiguilleur", 60, "Aiguilleur"], ["quarry", QUARRY_COST, "Carrière"], ["crank", 400, "Manivelle"], ["kiln_belt", 4700], ["paint_table_belt", 4700], ["star_press", 4700], ["loom", 4700], ["wreath_table_belt", 4700]],
  4:[["belt_fonte", 20, "Tapis en fonte"], ["boiler", 1200, "Chaudière"], ...["steam_furnace", "steam_sprayer", "steam_press", "steam_loom", "steam_wreath", "steam_tree"].map((k) => [k, 11350])],
  5:[["belt_metal", 60, "Tapis en métal"], ["generator", 8000, "Générateur"], ["pole", 400, "Poteau électrique"], ["extractor_sable", 3000, "Extracteur"],
    ["chest_metal", 500, "Coffre en métal"], ...["elec_furnace", "paint_booth", "assembler", "elec_loom", "elec_wreath", "tree_decorator"].map((k) => [k, 23240])],
};
const BELT_COST = { bois:5, fonte:20, metal:60 };
// Serre de l'usine (dessin : tools/usine-pixel/serre.py) : on plante, ça pousse en FLOWER_TIME (même hors ligne), on récolte ;
// la récolte (3 fleurs, tirées par le serveur) va dans l'inventaire de la salle. Images : 0 vide, 1 pousses, 2 plantes, 3 fleurs.
const FLOWER_TIME = 2 * 3600, MAX_BEDS = 10; // le serveur n'accepte que 10 serres (numéros 0 à 9)
const STAGE_OF = { poubelle:1, aiguilleur:3, quarry:3, crank:3, belt_fonte:4, boiler:4, belt_metal:5, generator:5, pole:5, chest_metal:5 };
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
  3:"Tapis à deux voies, goulottes, carrières, aiguilleurs, manivelles (remontées en un geste, elles tiennent 8 h) et machines à tapis.",
  4:"Chaudières (au bois) et machines à vapeur : elles tournent même quand tu n'es pas là. Tapis en fonte, deux fois plus rapides.",
  5:"Générateur, poteaux et extracteurs : l'usine s'alimente toute seule. Machines électriques et tapis en métal." };
const DIRS = { E:[1,0], S:[0,1], W:[-1,0], N:[0,-1] };
const LEFT = { E:"N", S:"E", W:"S", N:"W" };          // côté gauche du sens de marche
const ROT = ["e", "s", "w", "n"], BROT = ["E", "S", "W", "N"];
const OPP = { E:"W", W:"E", N:"S", S:"N" };
const BELT_ROWS = ["E","W","S","N","W>S","S>W","E>S","S>E","W>N","N>W","E>N","N>E"];
const BAG = 8, STACK = 20, OUT_CAP = 12, RANGE = 3;
const BELT_V = 0.5, GAP = 0.5;                         // 1 objet/s par voie, 2 objets/s par tapis
// Manivelle : un coup suffit à la remonter à fond, et elle tient CRANK_MAX (8 h, même quand on n'est pas là).
// Avant : 60 s de réserve, +10 s par toucher, 8 tapis au plus. L'étape 3 ne tournait que si l'on restait à tourner la manivelle,
// alors que les portes de l'étape 4 sont calées sur une production continue (tools/usine-sim : « Production runs 24/7 »).
const CRANK_MAX = 8 * 3600, CRANK_R = 4, CRANK_M = 4; // CRANK_M : machines par manivelle ; les tapis en bois à portée tournent tous
const SPECIES = ["cat","dog","bunny","duck","turtle","fish","fox","frog","penguin","unicorn","dragon","shark","whale","schrodinger"];
const ACCESSORIES = ["bow", "flower", "glasses", "scarf", "hat", "crown", "witch", "santa"]; // dessinés pour toutes les espèces (public/usine/accessoires)
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
    contracts:[], sales:[], stats:{}, test:false, avatar:{ species:"cat", color:0, acc:"santa" }, area:{ ...AREA0 } };
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
  if (e.kind === "machine") Object.assign(e, { inb:{}, outb:{}, craft:null, boost:0, recipe:e.recipe || (MACH[e.name].power ? defaultRecipe(e.name) : "auto"), color:e.color || null, lane:0, queue:[] });
  if (e.kind === "crank") e.reserve = CRANK_MAX;
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
function sprOf(name, stage, o) { const ob = META[stage].objects[name]; return o && ob[o] ? ob[o] : ob; } // sans orientation (tas, aiguilleur) : le même dessin
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
// Entrées d'une machine à tapis : un tapis peut arriver par n'importe quel côté, sauf la case de sortie.
// Avant, seule la case « entrée » prenait les objets : une machine à deux ingrédients (métier à tisser : fil et perles)
// devait tout recevoir sur un seul tapis, et si les deux se suivaient sur la même voie, elle se bloquait.
/** Le tapis posé en (bx, by) est-il celui de la sortie ? */
const isOutBelt = (pt, bx, by) => !!pt?.out && pt.out.outside[0] === bx && pt.out.outside[1] === by;
/** Les tapis qui entrent dans la machine. */
function feeders(e, pt = portsOf(e)) {
  const res = [];
  for (const [tx, ty] of tilesOf(e)) for (const [d, [dx, dy]] of Object.entries(DIRS)) {
    const bx = tx - dx, by = ty - dy, b = S.belts[bx + "," + by]; // tapis voisin qui avance vers cette case de la machine
    if (b && b.d === d && !isOutBelt(pt, bx, by)) res.push(b);
    const sw = !b && entAt(bx, by); // un aiguilleur collé à la machine peut aussi l'alimenter
    if (sw && sw.kind === "switch" && !isOutBelt(pt, bx, by) && !res.includes(sw)) res.push(sw);
  }
  return res;
}
/** Ports d'une machine à tapis qui ne sont reliés à rien : il faut au moins un tapis qui arrive, et un qui part de la sortie. */
function unlinked(e) {
  const pt = e.kind === "machine" && portsOf(e); if (!pt) return [];
  const out = [];
  if (pt.in && !feeders(e, pt).length) out.push("entrée");
  const ob = pt.out && S.belts[pt.out.outside[0] + "," + pt.out.outside[1]];
  if (pt.out && !(ob && ob.d !== OPP[pt.out.side]) && entAt(pt.out.outside[0], pt.out.outside[1])?.kind !== "switch") out.push("sortie");
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
// Ce qu'une machine automatique fabrique : UNE recette choisie (ou une « famille » de couleurs : fam:boule = boules
// peintes de toutes les couleurs), plus les intermédiaires qu'elle se fait elle-même (la peinture pour les boules).
// L'ancien mode « automatique » (tout ce qu'elle peut) mélangeait les recettes et bouchait les tapis : il est retiré.
const famOf = (r) => (r.color ? r.id.replace("_" + r.color, "") : null);
/** Les choix proposés dans la fiche : chaque famille de couleurs, puis chaque recette. */
function recipeChoices(name) {
  const all = RECIPES[name], out = [], seen = new Set();
  for (const r of all) {
    const f = famOf(r);
    if (f && !seen.has(f) && all.filter((x) => famOf(x) === f).length > 1) { seen.add(f); out.push({ id:"fam:" + f, fam:f, r }); }
  }
  for (const r of all) out.push({ id:r.id, r });
  return out;
}
/** Ce qu'une machine automatique fait d'office : le premier produit qui n'est pas l'intermédiaire d'une autre recette. */
function defaultRecipe(name) {
  const all = RECIPES[name];
  const fin = all.find((r) => !r.manual && !all.some((x) => x !== r && Object.keys(r.out).some((o) => Object.keys(x.in).some((k) => matches(o, k)))));
  const r = fin || all[0], f = famOf(r);
  return f && all.filter((x) => famOf(x) === f).length > 1 ? "fam:" + f : r.id;
}
function computeRecipes(m) {
  const all = RECIPES[m.name];
  let list;
  if (m.recipe === "auto") list = all.filter((r) => !r.manual); // vieilles parties pas encore reprises (voir dropGone)
  else {
    const fam = m.recipe?.startsWith("fam:") && m.recipe.slice(4);
    list = fam ? all.filter((r) => famOf(r) === fam) : [all.find((r) => r.id === m.recipe) || all[0]];
    if (!list.length) list = [all[0]];
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
function inputKey(m, it, belt = false) {
  for (const r of activeRecipes(m)) for (const k in r.in) if (matches(it, k) && count(m, k) < capFor(m, k)) return k;
  // Par le tapis, une machine à l'arrêt faute d'un autre ingrédient prend quand même (jusqu'à 3 fois le plein) : la voie avance
  // et l'ingrédient qui manque, coincé derrière, finit par arriver. Avant, une table de peinture pleine de boules sans peinture
  // refusait la boule de tête, et le pigment placé derrière n'arrivait jamais : la voie restait bloquée pour toujours.
  if (belt && starved(m)) for (const r of activeRecipes(m)) for (const k in r.in) if (matches(it, k) && count(m, k) < capFor(m, k) * 3) return k;
  return null;
}
/** Aucune recette n'a tous ses ingrédients (et rien n'est en cours). */
const starved = (m) => !m.craft && !activeRecipes(m).some((r) => Object.keys(r.in).every((k) => count(m, k) >= r.in[k]));
const accepts = (m, it, belt = false) => m.kind === "machine" && inputKey(m, it, belt) !== null;
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
const QUEUE_MAX = 30; // assez pour 24 boules et les 6 peintures qui vont avec
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
const possible = (m, r) => manual(m) ? possibleManual(m, r) : possibleAuto(m, r);
const possibleAuto = (m, r) => Math.max(0, Math.min(...Object.entries(r.in).map(([k, n]) => Math.floor((freeIn(m, k) + bagHas(k)) / n))));
// ---- Machines manuelles : au moment de demander, les ingrédients de base quittent le sac et sont mis de côté (m.res) ;
// la machine ne garde que ses intermédiaires (la peinture). Pas de plafond de sortie : une fabrication demandée se termine toujours.
const isBase = (m, k) => !RECIPES[m.name].some((r) => Object.keys(r.out).some((o) => matches(o, k)));
const resHas = (m, k) => Object.entries(m.res || {}).reduce((n, [it, q]) => n + (matches(it, k) ? q : 0), 0);
/** Retire n objets correspondant à `k` d'un stock { objet: quantité } ; renvoie ce qui a été pris. */
function takeFrom(store, k, n) {
  const got = {};
  for (const it of Object.keys(store)) {
    if (n <= 0 || !matches(it, k)) continue;
    const t = Math.min(n, store[it]); store[it] -= t; n -= t; got[it] = (got[it] || 0) + t; if (!store[it]) delete store[it];
  }
  return got;
}
/** Sans fabriquer d'intermédiaire : combien de fois `r` avec ce qui est déjà là (reprise des vieilles files). */
const possibleDirect = (m, r) => Math.max(0, Math.min(...Object.entries(r.in).map(([k, n]) =>
  Math.floor((isBase(m, k) ? count(m, k) + bagHas(k) : freeIn(m, k)) / n))));
/**
 * Ce qu'il faut demander pour n fois `r` : d'abord les intermédiaires qui manquent, fabriqués par la machine elle-même
 * (la peinture pour une boule, les planches pour une étoile), puis `r`. null si l'un d'eux ne peut pas se fabriquer ici.
 * Avant, il fallait demander soi-même « peinture rouge » puis les boules, dans le bon ordre et à raison de 4 boules par peinture.
 */
function planFor(m, r, n) {
  const steps = [];
  for (const [k, per] of Object.entries(r.in)) {
    if (isBase(m, k)) continue;
    const short = per * n - freeIn(m, k);
    if (short <= 0) continue;
    const p = RECIPES[m.name].find((x) => Object.keys(x.out).some((o) => matches(o, k)) && Object.keys(x.in).every((b) => isBase(m, b)));
    if (!p) return null;
    steps.push([p, Math.ceil(short / Object.entries(p.out).find(([o]) => matches(o, k))[1])]);
  }
  steps.push([r, n]);
  return steps;
}
/** Le sac (et le vieux stock de la machine) suffit-il pour tous les ingrédients de base de ces étapes ? */
function planOk(m, steps) {
  const need = {};
  for (const [p, t] of steps) for (const [k, per] of Object.entries(p.in)) if (isBase(m, k)) need[k] = (need[k] || 0) + per * t;
  return Object.entries(need).every(([k, q]) => count(m, k) + bagHas(k) >= q);
}
/** Combien de fois on peut encore demander `r` à une machine manuelle, intermédiaires compris, sans dépasser la file. */
function possibleManual(m, r) {
  const room = QUEUE_MAX - (m.queue || []).length;
  let best = 0;
  for (let n = 1; n <= QUEUE_MAX; n++) {
    const steps = planFor(m, r, n);
    if (!steps || !planOk(m, steps) || steps.reduce((a, [, t]) => a + t, 0) > room) break;
    best = n;
  }
  return best;
}
/** Met de côté les ingrédients de base de n fois `r` (vieux stock de la machine d'abord, puis le sac). */
function reserve(m, r, n) {
  m.res ||= {};
  for (const [k, per] of Object.entries(r.in)) {
    if (!isBase(m, k)) continue;
    let need = per * n;
    for (const [it, t] of Object.entries(takeFrom(m.inb, k, need))) { m.res[it] = (m.res[it] || 0) + t; need -= t; }
    for (let i = 0; i < BAG && need > 0; i++) {
      const sl = S.bag[i]; if (!sl || !matches(sl.it, k)) continue;
      const t = Math.min(need, sl.n); sl.n -= t; need -= t; m.res[sl.it] = (m.res[sl.it] || 0) + t; if (!sl.n) S.bag[i] = null;
    }
  }
}
/** Vieilles parties : la file d'avant les réservations est reprise (ce qui peut se réserver est gardé, le reste retiré). */
function migrateQueue(m) {
  const q = m.queue || []; m.queue = []; m.res ||= {};
  for (const id of q) { const r = recipeOf(m, id); if (r && possibleDirect(m, r) >= 1) { reserve(m, r, 1); m.queue.push(id); } }
  m.resV = 1;
}
/** Vider la file : les ingrédients mis de côté reviennent dans le sac. */
function clearQueue(m) {
  m.queue = [];
  for (const it of Object.keys(m.res || {})) { const k = bagAdd(it, m.res[it]); m.res[it] -= k; if (!m.res[it]) delete m.res[it]; }
  if (Object.keys(m.res || {}).length) toast("Sac plein : le reste attend dans la machine.");
}
/** Vend tout ce que le sac contient de `it` (ou de tout ce qui se vend si `it` est absent), à la caisse `c`. */
function sellBag(c, it) {
  let v = 0;
  for (let i = 0; i < BAG; i++) { const sl = S.bag[i]; if (sl && price(sl.it) && (!it || sl.it === it)) { v += price(sl.it) * sl.n; sell(sl.it, sl.n); S.bag[i] = null; } }
  if (v) { fx(c.x * T + 16, c.y * T, "+" + fmtN(v), "#ffd65a"); S.player.work = 0.3; }
}
/** Ce que la machine fabrique elle-même (ses intermédiaires, qu'elle garde) : tout le reste est un ingrédient de base. */
const madeHere = (m, it) => RECIPES[m.name].some((r) => Object.keys(r.out).includes(it));
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
function updateMachine(m, dt) {
  const info = MACH[m.name];
  if (!m.craft) {
    if (manual(m)) {
      if (!m.resV) migrateQueue(m);
      // la première de la file dont les intermédiaires sont prêts (une boule peut attendre la peinture demandée juste avant)
      const ok = (r) => Object.entries(r.in).every(([k, n]) => (isBase(m, k) ? resHas(m, k) : count(m, k)) >= n);
      const i = (m.queue ||= []).findIndex((id) => { const r = recipeOf(m, id); return r && ok(r); });
      if (i >= 0) {
        const r = recipeOf(m, m.queue[i]);
        for (const [k, n] of Object.entries(r.in)) { if (isBase(m, k)) takeFrom(m.res, k, n); else consume(m, k, n); }
        m.craft = { id:r.id, t:0, dur:r.t / SPEED[info.stage] }; m.queue.splice(i, 1);
      }
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
        m.craft = null; crafted++;
      }
    }
  }
  const pt = portsOf(m);
  if (pt && outTotal(m) > 0) {
    const [bx, by] = pt.out.outside, b = S.belts[bx + "," + by];
    const sw = !b && entAt(bx, by);
    if (sw && sw.kind === "switch") { // aiguilleur collé à la sortie : la machine lui passe directement ce qu'elle a fait
      const it = Object.keys(m.outb)[0];
      const lane = m.outLane === 1 ? 1 : m.outLane === "b" ? (m.lane || 0) : 0;
      if (deliver({ x:pt.out.inside[0], y:pt.out.inside[1], d:pt.out.side }, lane, it)) { if (!--m.outb[it]) delete m.outb[it]; m.lane = 1 - lane; }
    } else if (b && b.d !== OPP[pt.out.side] && b.on) {
      // voie de sortie choisie dans la fiche : gauche (par défaut, comme avant), droite, ou les deux à tour de rôle
      let lane = m.outLane === 1 ? 1 : m.outLane === "b" ? (m.lane || 0) : 0;
      if (!laneRoom(b, lane, 0) && m.outLane === "b" && laneRoom(b, 1 - lane, 0)) lane = 1 - lane;
      if (laneRoom(b, lane, 0)) { const it = Object.keys(m.outb)[0]; b.lanes[lane].push({ it, p:0 }); if (!--m.outb[it]) delete m.outb[it]; m.lane = 1 - lane; }
    }
  }
}

// Sortie d'une goulotte, d'une carrière ou d'un extracteur : avant, ils versaient sur tous les tapis qui les touchaient,
// et la voie dépendait de leur place. On choisit maintenant les côtés où ils versent (un ou plusieurs, servis à tour de
// rôle) et, pour chacun, la voie du tapis : celle du haut, celle du bas (même celle d'en face), ou les deux.
// e.outs = { N:0|1|"b", … } ; absent ou vide : tous les côtés, comme avant.
const SIDES = ["N", "E", "S", "W"];
const SIDE_NAME = { N:"Haut", E:"Droite", S:"Bas", W:"Gauche" };
const LANE_NAME = { N:"du haut", E:"de droite", S:"du bas", W:"de gauche" };
const hasOuts = (e) => !!e.outs && Object.keys(e.outs).length > 0;
/** Les deux voies d'un tapis, nommées comme on les voit à l'écran (voie 0 = à gauche dans le sens du tapis). */
const laneNames = (b) => (b ? [LANE_NAME[LEFT[b.d]], LANE_NAME[OPP[LEFT[b.d]]]] : ["de gauche", "de droite"]);
function outControls(e) {
  const what = e.kind === "source" ? "le tas" : "l'extracteur", all = !hasOuts(e);
  let h = `<h3>${icon("tapis")} Elle verse vers</h3><div class="row"><button class="btn sm ${all ? "on" : ""}" data-oall="1">Tous les côtés</button>`
    + `<span class="muted">${all ? `tous les tapis qui touchent ${what}` : "les côtés choisis, à tour de rôle"}</span></div><div class="card">`;
  for (const d of SIDES) {
    const [dx, dy] = DIRS[d], b = S.belts[(e.x + dx) + "," + (e.y + dy)], ok = b && b.d !== OPP[d];
    const cur = e.outs?.[d], [l0, l1] = laneNames(ok ? b : null);
    const btn = (v, txt) => `<button class="btn sm ${!all && (v === "off" ? cur === undefined : cur === v) ? "on" : ""}" data-oside="${d}" data-olane="${v}">${txt}</button>`;
    h += `<div class="row" style="flex-wrap:wrap;gap:4px"><span style="min-width:4.5em">${SIDE_NAME[d]}</span>${btn("off", "Non")}${btn("b", "Les deux")}${btn(0, "Voie " + l0)}${btn(1, "Voie " + l1)}`
      + (ok ? "" : `<span class="muted">(pas de tapis qui part de ce côté)</span>`) + `</div>`;
  }
  return h + `</div><p class="muted">Une flèche dorée sur ${what} montre chaque côté choisi.</p>`;
}
/** Voie de sortie d'une machine à tapis : à gauche dans le sens du tapis (comme avant), à droite, ou les deux. */
function machineLaneControls(m, pt) {
  const b = S.belts[pt.out.outside[0] + "," + pt.out.outside[1]], ok = b && b.d !== OPP[pt.out.side];
  const [l0, l1] = laneNames(ok ? b : null), cur = m.outLane ?? 0;
  const btn = (v, txt) => `<button class="btn sm ${cur === v ? "on" : ""}" data-mlane="${v}">${txt}</button>`;
  return `<div class="row" style="flex-wrap:wrap;gap:4px"><span class="muted">Sortie sur</span><span class="grow"></span>${btn(0, "Voie " + l0)}${btn(1, "Voie " + l1)}${btn("b", "Les deux")}</div>`;
}

/** Pourquoi une machine est sans énergie (phrase à afficher). */
function whyNoPower(m) {
  const pw = MACH[m.name].power;
  if (pw === "steam") return "il faut une chaudière avec du bois à 4 cases.";
  if (pw === "elec") return `il faut un poteau à ${POLE_R} cases et un générateur avec du bois.`;
  const near = S.ents.filter((c) => c.kind === "crank" && distTo(m, c.x, c.y) <= CRANK_R);
  if (!near.length) return `pose une manivelle à ${CRANK_R} cases au plus.`;
  if (near.every((c) => c.reserve <= 0)) return "remonte la manivelle à côté.";
  return `les manivelles à côté font déjà tourner ${CRANK_M} machines chacune : ajoutes-en une.`;
}

/** Petites flèches dorées sur les bords d'une goulotte ou d'un extracteur, une par côté où il verse. */
function drawOutArrow(e) { if (hasOuts(e)) for (const d in e.outs) drawArrowSide(e, d); }
function drawArrowSide(e, side) {
  const [dx, dy] = DIRS[side], cx = e.x * T + 16 + dx * 13, cy = e.y * T + 16 + dy * 13, px = -dy, py = dx; // pointe, puis perpendiculaire
  ctx.fillStyle = "#f6c445"; ctx.strokeStyle = "#1c1820"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx + dx * 4, cy + dy * 4); ctx.lineTo(cx + px * 4, cy + py * 4); ctx.lineTo(cx - px * 4, cy - py * 4); ctx.closePath(); ctx.fill(); ctx.stroke();
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
      .map((m) => [distTo(m, c.x, c.y), m]).filter(([d]) => d <= CRANK_R).sort((a, b) => a[0] - b[0]).slice(0, CRANK_M);
    const bs = Object.values(S.belts).filter((b) => (b.k || "bois") === "bois" && !powered.has("b" + b.x + "," + b.y))
      .filter((b) => Math.max(Math.abs(b.x - c.x), Math.abs(b.y - c.y)) <= CRANK_R);
    for (const [, m] of ms) powered.add("m" + m.id);
    for (const b of bs) powered.add("b" + b.x + "," + b.y);
    c.load = ms.length + bs.length; c.machines = ms.length;
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
/**
 * Aiguilleur (étape 3) : il ne garde rien, il fait suivre l'objet tout de suite.
 * - Sans filtre : il répartit à parts égales, chacun son tour, entre tout droit, gauche et droite.
 * - Avec un filtre : l'objet choisi va tout droit, les autres partent sur les côtés.
 * Un tapis, une machine, un coffre, la caisse ou un autre aiguilleur peuvent être à chaque sortie. Comme dans Mindustry.
 */
function throughSwitch(sw, from, lane, it, depth) {
  if (depth > 6) return false; // une boucle d'aiguilleurs collés : on s'arrête
  const left = LEFT[from], right = OPP[left];
  const exits = sw.filter ? (matches(it, sw.filter) ? [from] : [left, right]) : [from, left, right];
  for (let k = 0; k < exits.length; k++) {
    const i = ((sw.rr || 0) + k) % exits.length;
    if (deliver({ x:sw.x, y:sw.y, d:exits[i] }, lane, it, depth + 1)) { sw.rr = i + 1; sw.seen = it; return true; }
  }
  return false;
}
function deliver(b, lane, it, depth = 0) {   // l'objet de tête est au bout du tapis : où va-t-il ?
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
  if (e.kind === "switch") return throughSwitch(e, b.d, lane, it, depth);
  if (e.kind === "trash") { e.eaten = (e.eaten || 0) + 1; return true; } // la poubelle avale tout ce qu'un tapis lui amène
  if (e.kind === "crate") { if (!price(it)) return false; sell(it, 1, nx, ny); return true; }
  if (e.kind === "chest") return chestAdd(e, it, 1) === 1;
  if (e.kind === "boiler" || e.kind === "generator") { if (it !== "bois" || e.fuel > FUEL_CAP - 1) return false; e.fuel++; return true; }
  if (e.kind === "machine") {
    const pt = portsOf(e); if (!pt) return false;
    if (isOutBelt(pt, b.x, b.y) || !accepts(e, it, true)) return false; // par tous les côtés sauf la sortie ; ingrédient en trop : la voie se bloque
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
    // côtés choisis (à tour de rôle), sinon tous ; pour chacun : sa voie (0, 1), ou les deux en alternant ("b")
    const chosen = hasOuts(s), sides = chosen ? SIDES.filter((d) => d in s.outs) : SIDES;
    for (let put = 0; put < 2 && s.acc >= 1 && !(chute && s.stock < 1); put++)
    for (let k = 0; k < sides.length; k++) {
      const side = sides[((s.rr || 0) + k) % sides.length], [dx, dy] = DIRS[side];
      const b = S.belts[(s.x + dx) + "," + (s.y + dy)];
      if (!b || !b.on || b.d === OPP[side]) continue;
      const from = OPP[side];                          // côté du tapis où se trouve la source
      const pick = chosen ? s.outs[side] : null;
      let lane = pick === 0 || pick === 1 ? pick       // voie choisie (même celle d'en face)
        : pick === "b" || from === b.d || from === OPP[b.d] ? (s.lane || 0) : from === LEFT[b.d] ? 0 : 1;
      const at = from === OPP[b.d] ? 0 : 0.5;
      if (!laneRoom(b, lane, at)) { if (pick !== "b" || !laneRoom(b, 1 - lane, at)) continue; lane = 1 - lane; }
      b.lanes[lane].push({ it:s.gives, p:at }); if (chute) s.stock--; s.acc -= 1; s.lane = 1 - lane;
      s.rr = ((s.rr || 0) + k + 1) % sides.length; break;
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
const SELL = { 1:["boule_rouge", "boule_verte", "boule_or", "boule_bleue", "@boule_peinte"], 2:["couronne", "etoile_bois", "sapin_decore"], 3:["@boule_finie", "etoile_doree", "guirlande", "couronne_deco"], 4:[], 5:[] };
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
  toast(`Étape ${S.stage} : ${STAGE_NAMES[S.stage]} !`, 3000); ui.dirty = true;
  if (STAGE_TOURS[S.stage]) setTimeout(() => { if (!S.visit) tourShow(S.stage); }, 800); // la visite guidée de la nouvelle étape
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
  if (e.kind === "crate") { if (first) select(e); return; } // la fiche de la caisse : on choisit quoi vendre (les tapis, eux, vendent tout seuls)
  if (e.kind === "chest") { if (first) select(e); return; } // on choisit dans sa fiche ce qu'on dépose ou reprend
  if (e.kind === "crank") {
    if (first) { e.reserve = CRANK_MAX; p.work = 0.6; fx(e.x * T + 16, e.y * T, "Remontée : 8 h", "#9ad8ff"); computePower(); select(e); }
    return;
  }
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
  if (e.kind === "extractor" || e.kind === "pole" || e.kind === "switch" || e.kind === "trash") { if (first) select(e); return; }
  if (e.kind !== "machine") return;
  let moved = 0;
  if (manual(e)) {                                      // machine manuelle : les ingrédients de base restent dans le sac
    for (const it of Object.keys(e.inb)) if (!madeHere(e, it)) { const k = bagAdd(it, e.inb[it]); e.inb[it] -= k; moved += k; if (!e.inb[it]) delete e.inb[it]; }
  } else for (let i = 0; i < BAG; i++) {                // machine automatique : déposer ce qu'elle accepte
    const s = S.bag[i]; if (!s) continue;
    while (s.n > 0 && accepts(e, s.it)) { e.inb[s.it] = (e.inb[s.it] || 0) + 1; s.n--; moved++; }
    if (!s.n) S.bag[i] = null;
  }
  for (const it of Object.keys(e.outb)) { const k = bagAdd(it, e.outb[it]); e.outb[it] -= k; moved += k; if (!e.outb[it]) delete e.outb[it]; }
  if (e.craft && !e.stalled) { e.boost = 0.4; p.work = 0.4; }
  else if (moved) p.work = 0.3;
  if (first) {
    select(e, true);
    if (!moved && !e.craft && !manual(e)) toast(e.stalled ? `Pas d'énergie : ${whyNoPower(e)}` : `${MACH[e.name].name} : il manque ${missing(e).join(", ") || "de la place en sortie"}.`);
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
  if (key === "quarry") return quarryCost();
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
  if (key === "quarry") { // une carrière : un tas de plus, où l'on veut, avec sa goulotte (sable au départ, à changer dans sa fiche)
    addEnt({ kind:"source", name:"source_sable", stage:3, gives:"sable", quarry:true, paid:cost, x, y, stock:0, chute:true, acc:0, lane:0 });
    S.coins -= cost; return true;
  }
  if (key === "poubelle") { addEnt({ kind:"trash", name:"poubelle", stage:1, x, y, eaten:0 }); S.coins -= cost; return true; }
  if (key === "aiguilleur") { addEnt({ kind:"switch", name:"aiguilleur", stage:3, x, y, filter:null, rr:0 }); S.coins -= cost; return true; }
  const kind = MACH[key] ? "machine" : ["crank", "boiler", "generator", "pole"].includes(key) ? key : key.startsWith("extractor") ? "extractor" : key === "serre_fleurs" ? "flowerbed" : "chest";
  addEnt({ kind, name:key, stage:stageOf(key), x, y, o:hasOri(key) ? o : key.startsWith("extractor") ? "e" : undefined, store:kind === "chest" ? {} : undefined,
    ...(kind === "flowerbed" ? { planted:false, grown:0 } : kind === "boiler" || kind === "generator" ? { fuel:0 } : kind === "extractor" ? { gives:"sable", rate:0.25, acc:0, lane:0 } : {}) });
  S.coins -= cost; return true;
}
function demolish(x, y) {
  const b = S.belts[x + "," + y];
  if (b) { delete S.belts[x + "," + y]; S.coins += BELT_COST[b.k || "bois"]; return; }
  const e = entAt(x, y);
  if (!e || ["source", "crate", "deco", "rug"].includes(e.kind) && !e.quarry) return;
  if (e.kind === "chest" && S.ents.filter((c) => c.kind === "chest").length === 1) { toast("Garde au moins un coffre."); return; }
  if (e.kind === "chest" && chestTotal(e) > 0) { toast("Vide le coffre avant de le démonter."); return; } // avant : son contenu disparaissait
  // Ce que la machine contenait (ingrédients mis de côté compris) revient dans le sac, autant qu'il en tient.
  let lost = 0;
  if (e.kind === "machine") for (const box of [e.inb, e.outb, e.res]) for (const [it, n] of Object.entries(box || {})) lost += n - bagAdd(it, n);
  if (lost) toast(`Sac plein : ${lost} objet${lost > 1 ? "s" : ""} perdu${lost > 1 ? "s" : ""}.`);
  S.ents = S.ents.filter((z) => z !== e); invalidate();
  S.coins += Math.round((e.quarry ? e.paid || QUARRY_COST : costOf(e.name)) / 2);
  if (ui.sel === e.id) ui.sel = null;
  toast(`${e.quarry ? "Carrière" : nameOf(e.name)} démonté${e.quarry ? "e" : ""} : la moitié du prix est rendue.`);
}
/**
 * Démonter un bâtiment se confirme : il faut toucher une seconde fois (le même, dans les 4 s), au mode Démonter comme
 * avec le bouton de sa fiche. Avant, un seul toucher suffisait, et on perdait la moitié du prix sur une erreur.
 * Les tapis se démontent toujours d'un coup (on en enlève souvent plusieurs, ils ne coûtent presque rien).
 */
const CONFIRM_S = 4;
const confirming = (e) => !!ui.confirmDemol && ui.confirmDemol.id === e.id && performance.now() - ui.confirmDemol.at < CONFIRM_S * 1000;
function askDemolish(e) {
  if (["source", "crate", "deco", "rug"].includes(e.kind) && !e.quarry) return;
  if (confirming(e)) { ui.confirmDemol = null; demolish(e.x, e.y); ui.dirty = true; return; }
  ui.confirmDemol = { id:e.id, at:performance.now() };
  toast(`Touche encore pour démonter : ${e.quarry ? "Carrière" : nameOf(e.name)} (la moitié du prix est rendue).`);
  ui.dirty = true;
  setTimeout(() => { ui.dirty = true; }, CONFIRM_S * 1000 + 50); // le bouton reprend son texte
}
const demolBtn = (e) => `<button class="btn rouge" id="demol">${icon("poubelle")} ${confirming(e) ? "Sûr ? Démonter" : "Démonter"}</button>`;

// Déplacer un objet déjà posé (appui long) : machines, coffres, manivelles, énergie, décorations (pas les tas ni la caisse).
const MOVABLE = ["machine", "switch", "trash", "chest", "crank", "boiler", "generator", "pole", "extractor", "flowerbed", "deco", "source", "crate"];
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
  const keep = recipeChoices(t).some((c) => c.id === e.recipe) ? e.recipe : defaultRecipe(t); // elle garde sa recette si la nouvelle sait la faire
  Object.assign(e, { name:t, stage:st, inb:{}, outb:{}, craft:null, recipe:keep, color:null, queue:[] });
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
  // S.simAt : heure réelle jusqu'à laquelle l'usine a été calculée (les sauvegardes n'y touchent pas : elles continuent
  // en arrière-plan alors que l'usine, elle, ne tourne pas). Plus de 5 s de retard : on rattrape tout d'un coup.
  if (!catching) {
    if (!S.simAt) S.simAt = S.savedAt || Date.now();
    if (Date.now() - S.simAt > 5000) catchUp(); else { step(dt); S.simAt = Date.now(); }
  }
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
// Vue déplacée à la main (deux doigts, clic droit, molette ; un doigt en visite) : la caméra ne suit plus le lutin
// jusqu'à ce qu'on touche le sol pour marcher, ou que le lutin sorte de l'écran en marchant. camEase : elle y revient en douceur.
let camFree = false, camEase = false;
// Zone morte de la caméra (fraction de la vue, centrée) : le personnage s'y déplace sans que la caméra bouge.
const DEAD_W = 0.4, DEAD_H = 0.35;
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4]; // paliers fins ; sous 1 : voir toute l'usine
const ZMIN = ZOOMS[0], ZMAX = ZOOMS[ZOOMS.length - 1];
/** Change le zoom en gardant fixe le point de l'écran (cx, cy), en pixels du canevas ; par défaut le centre. */
function setZoom(z, cx = cssW / 2, cy = cssH / 2) {
  z = Math.max(ZMIN, Math.min(ZMAX, z));
  const wx = cam.x + cx / zoom, wy = cam.y + cy / zoom;
  zoom = z; cam.x = wx - cx / z; cam.y = wy - cy / z;
}
/** Palier de zoom suivant (dir = 1) ou précédent (dir = -1), même si le zoom actuel est entre deux paliers (pincement). */
function zoomStep(dir, cx, cy) {
  const next = dir > 0 ? ZOOMS.find((z) => z > zoom + 1e-6) : [...ZOOMS].reverse().find((z) => z < zoom - 1e-6);
  if (next) setZoom(next, cx, cy);
}
/** Le plus grand palier où tout l'atelier tient à l'écran (pour une visite). */
const fitAll = () => [...ZOOMS].reverse().find((z) => S.area.w * T * z <= cssW && S.area.h * T * z <= cssH + 60 * z) || ZMIN;
function resize() {
  const r = cv.parentElement.getBoundingClientRect();
  dpr = Math.max(1, Math.round(window.devicePixelRatio || 1)); cssW = r.width; cssH = r.height;
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  cv.style.width = cssW + "px"; cv.style.height = cssH + "px";
}
function fitZoom() { let z = 1; for (const c of ZOOMS) if (c >= 1 && S.area.w * T * c <= cssW * 1.05) z = c; zoom = z; } // à l'ouverture : comme avant (jamais sous 1)
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
    acc:av.acc ? `usine/accessoires/${av.species}-${av.acc}.png` : av.santa ? `usine/accessoires/${av.species}-santa.png` : null };
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
    if (e.chute && hasOuts(e)) drawOutArrow(e);
  }
  if (e.kind === "crank") bar(e.x * T + 4, Y - 5, 24, e.reserve / CRANK_MAX, e.reserve > CRANK_MAX * 0.1 ? "#9ad8ff" : "#d8382f");
  if (e.kind === "extractor") text(fmtN(e.rate) + "/s", e.x * T + 16, e.y * T + 30, "#9ad8ff");
  if (e.kind === "switch" && e.filter) drawItem(iconOf(e.filter), e.x * T + 8, e.y * T - 4);
  if (e.kind === "extractor" && hasOuts(e)) drawOutArrow(e);
  if (e.kind === "chest") { const n = Object.values(e.store).reduce((a, b) => a + b, 0); if (n) text(String(n), e.x * T + 26, e.y * T, "#ffffff"); }
}
// Vitre des fenêtres du mur du fond (rectangle dans la case de 32 × 64, variante « fenêtre ») : la neige y tombe.
const WINDOW_PANE = { wall_log:[6, 12, 25, 38], wall_brick:[7, 12, 24, 23] };
function snowIn(X, [x0, y0, x1, y1], time) {
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  for (let k = 0; k < 7; k++) {
    const r = hash(X + k, k * 7 + 3), sp = 5 + (r % 6), big = r % 5 === 0;
    const y = (time * sp + (r % 97)) % h, dx = Math.round(Math.sin(time * 1.3 + k) * 1.2);
    const fx = x0 + (((r >>> 3) % w) + dx + w) % w;
    ctx.fillStyle = big ? "#ffffff" : "rgba(255,255,255,.75)";
    ctx.fillRect(X + fx, y0 + Math.floor(y), big ? 2 : 1, big ? 2 : 1);
  }
}
function draw(time) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#1b120d"; ctx.fillRect(0, 0, cv.width, cv.height);
  const s = zoom * dpr, vw = cssW / zoom, vh = cssH / zoom, p = S.player;
  const fx = p.px * T + 16, fy = p.py * T + 16;
  if (!camReady) { cam.x = fx - vw / 2; cam.y = fy - vh / 2; camReady = true; }
  // vue libre : le lutin qui marche et sort de l'écran la fait revenir sur lui
  if (camFree && !S.visit && p.path.length && (fx < cam.x || fx > cam.x + vw || fy < cam.y || fy > cam.y + vh)) { camFree = false; camEase = true; }
  if (!camFree) {
    let tx = cam.x, ty = cam.y;
    const l = tx + vw * (0.5 - DEAD_W / 2), r = tx + vw * (0.5 + DEAD_W / 2), t = ty + vh * (0.5 - DEAD_H / 2), b = ty + vh * (0.5 + DEAD_H / 2);
    if (fx < l) tx -= l - fx; else if (fx > r) tx += fx - r;
    if (fy < t) ty -= t - fy; else if (fy > b) ty += fy - b;
    const k = camEase ? 0.18 : 1;
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
    if (camEase && Math.abs(tx - cam.x) < 0.5 && Math.abs(ty - cam.y) < 0.5) camEase = false;
  }
  const AW = S.area.w * T, AH = S.area.h * T;
  cam.x = AW <= vw ? (AW - vw) / 2 : Math.max(0, Math.min(AW - vw, cam.x));
  cam.y = AH <= vh ? (AH - vh) / 2 : Math.max(0, Math.min(AH - vh + 60, cam.y));
  ctx.setTransform(s, 0, 0, s, Math.round(-cam.x * s), Math.round(-cam.y * s));
  ctx.imageSmoothingEnabled = false;
  const st = S.stage, wall = stageImg(st, TILESET[st][1] + ".png"), floor = stageImg(st, TILESET[st][0] + ".png");
  const pane = WINDOW_PANE[TILESET[st][1]];
  for (let x = 0; x < S.area.w; x++) {
    const v = hash(x, 0) % 7 === 0 ? 1 : hash(x, 1) % 9 === 0 ? 2 : 0;
    if (wall) ctx.drawImage(wall, v * 32, 0, 32, 64, x * T, 0, 32, 64);
    if (pane && v === 1) snowIn(x * T, pane, time);
    for (let y = Y0; y < S.area.h; y++) if (floor) { const h = hash(x, y) % 10, n = floor.width / 32; const v = n === 2 ? (h < 8 ? 0 : 1) : st === 5 ? 0 : (h < 7 ? 0 : h < 9 ? 1 : 2); ctx.drawImage(floor, v * 32, 0, 32, 32, x * T, y * T, 32, 32); }
  }
  // portée du personnage
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
      if (pt) { text("entrée", pt.in.outside[0] * T + 16, pt.in.outside[1] * T + 18, "#9ad8ff"); text("sortie", pt.out.outside[0] * T + 16, pt.out.outside[1] * T + 18, "#ffd65a"); } // (entrée : ou par les autres côtés)
    }
  }
  const tuEnt = curStep()?.ent?.();
  if (tuEnt) { // tutoriel : flèche dorée qui rebondit au-dessus de l'objet montré
    const sp = spr(tuEnt), f = fp(tuEnt), cx = (tuEnt.x + f.w / 2) * T, top = tuEnt.y * T - ((sp.origin || [0, 0])[1]) - 6 - Math.abs(Math.sin(time * 4)) * 5;
    ctx.fillStyle = "#1c1820"; ctx.beginPath(); ctx.moveTo(cx - 7, top - 9); ctx.lineTo(cx + 7, top - 9); ctx.lineTo(cx, top + 1); ctx.fill();
    ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.moveTo(cx - 5, top - 8); ctx.lineTo(cx + 5, top - 8); ctx.lineTo(cx, top - 1); ctx.fill();
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
  { const c = ui.confirmDemol && byId(ui.confirmDemol.id); // bâtiment en attente de confirmation : cadre rouge qui clignote
    if (c && confirming(c) && Math.floor(time * 4) % 2) { const f = fp(c); ctx.strokeStyle = "#d8382f"; ctx.lineWidth = 2; ctx.strokeRect(c.x * T + 1, c.y * T + 1, f.w * T - 2, f.h * T - 2); ctx.lineWidth = 1; } }
  if (ui.target) { const [tx, ty] = ui.target; ctx.strokeStyle = "rgba(255,214,90,.7)"; ctx.strokeRect(tx * T + 8.5, ty * T + 8.5, 15, 15); }
  for (const f of fxs) { ctx.globalAlpha = 1 - f.t / 1.2; text(f.text, f.x, f.y - f.t * 18, f.color); ctx.globalAlpha = 1; }
}

// ---------------------------------------------------------------- entrées
const ui = { mode:"hand", build:null, rot:0, sel:null, hover:null, target:null, dirty:true, tab:"commandes", drag:null, hold:null, holdT:0, harvest:0 };
function tileAt(ev) {
  const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / zoom + cam.x, y = (ev.clientY - r.top) / zoom + cam.y;
  return [Math.floor(x / T), Math.floor(y / T)];
}
// ---- Déplacer la vue : deux doigts (glisser, pincer pour zoomer), clic droit ou du milieu, molette ; un doigt en visite.
const ptrs = new Map(); let pinch = null, pan = null;
const canvasXY = (x, y) => { const r = cv.getBoundingClientRect(); return [x - r.left, y - r.top]; };
function startPinch() {
  const [a, b] = [...ptrs.values()];
  const [mx, my] = canvasXY((a.x + b.x) / 2, (a.y + b.y) / 2);
  pinch = { d:Math.hypot(a.x - b.x, a.y - b.y) || 1, wx:cam.x + mx / zoom, wy:cam.y + my / zoom, z:zoom };
  // le geste à un doigt commencé juste avant (marcher, appui long, tracé de tapis) s'arrête
  if (ui.press) clearTimeout(ui.press.timer);
  ui.press = null; ui.follow = null; ui.hold = null; ui.drag = null; ui.placeDrag = null;
  camFree = true;
}
function movePinch() {
  const [a, b] = [...ptrs.values()];
  const [mx, my] = canvasXY((a.x + b.x) / 2, (a.y + b.y) / 2);
  zoom = Math.max(ZMIN, Math.min(ZMAX, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
  cam.x = pinch.wx - mx / zoom; cam.y = pinch.wy - my / zoom;
}
cv.addEventListener("wheel", (ev) => {
  ev.preventDefault();
  const [cx, cy] = canvasXY(ev.clientX, ev.clientY);
  zoomStep(ev.deltaY < 0 ? 1 : -1, cx, cy); camFree = true;
}, { passive:false });
cv.addEventListener("pointermove", (ev) => {
  if (ptrs.has(ev.pointerId)) ptrs.set(ev.pointerId, { x:ev.clientX, y:ev.clientY });
  if (pinch && ptrs.size >= 2) { movePinch(); return; }
  if (pan) { cam.x = pan.cx - (ev.clientX - pan.x) / zoom; cam.y = pan.cy - (ev.clientY - pan.y) / zoom; camFree = true; return; }
  if (pinch) return; // un doigt reste après un pincement : il ne fait rien de plus
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
const release = (ev) => {
  ptrs.delete(ev.pointerId);
  if (pinch) { // fin du pincement : on se cale sur le palier de zoom le plus proche (pixels nets)
    if (ptrs.size < 2) { const near = ZOOMS.reduce((a, z) => (Math.abs(z - zoom) < Math.abs(a - zoom) ? z : a)); setZoom(near); }
    if (!ptrs.size) pinch = null;
    return;
  }
  if (pan) { if (!ptrs.size) pan = null; return; }
  ui.drag = null; ui.hold = null; ui.placeDrag = null; ui.follow = null;
  // appui court sur un objet déplaçable : son menu s'ouvre au relâché (un appui long l'a pris en main à la place)
  const p = ui.press; ui.press = null;
  if (p && !p.fired) { clearTimeout(p.timer); const e = byId(p.id); if (e) reach(e); }
};
cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);
cv.addEventListener("contextmenu", (ev) => ev.preventDefault());
cv.addEventListener("pointerdown", (ev) => {
  ptrs.set(ev.pointerId, { x:ev.clientX, y:ev.clientY });
  try { cv.setPointerCapture(ev.pointerId); } catch {}
  if (ptrs.size === 2) { pan = null; startPinch(); return; }
  if (ptrs.size > 2 || pinch) return;
  // en visite (on regarde seulement), ou au clic droit / du milieu : on fait glisser la vue
  if (S.visit || ev.button === 1 || ev.button === 2) { if (S.visit) closePanel(); pan = { x:ev.clientX, y:ev.clientY, cx:cam.x, cy:cam.y }; return; }
  const [x, y] = tileAt(ev); ui.hover = [x, y];
  if (ui.mode === "build" && ui.build) {
    if (place(ui.build, ui.rot, x, y) && ui.build === "belt") ui.drag = [x, y];
    ui.dirty = true; return;
  }
  if (ui.mode === "demolish") { const e = !S.belts[x + "," + y] && entAt(x, y); if (e) askDemolish(e); else demolish(x, y); ui.dirty = true; return; }
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
    if (camFree) { camFree = false; camEase = true; } // toucher le sol pour marcher : la caméra revient sur le lutin
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
  if (ui.tour) tourRefresh();
  $("coins").textContent = fmt(S.coins); $("stars").textContent = fmt(S.stars);
  $("stage").textContent = `Étape ${S.stage} · ${STAGE_NAMES[S.stage]}`;
  for (const b of document.querySelectorAll("[data-mode]")) b.classList.toggle("on", b.dataset.mode === ui.mode);
  for (const b of document.querySelectorAll("[data-tab]")) b.classList.toggle("on", b.dataset.tab === ui.tab);
  const panel = document.body.classList.contains("panel");
  for (const b of document.querySelectorAll("[data-page]")) b.classList.toggle("on", panel && b.dataset.page === ui.tab);
  const q = ui.place;
  $("placebar").hidden = !q;
  if (q) { $("prot").hidden = !q.o || q.key.startsWith("extractor"); $("pdel").hidden = !(q.belt || (q.id && (!["source", "crate", "deco", "rug"].includes(byId(q.id)?.kind) || byId(q.id)?.quarry))); /* ce qui se démonte */ $("pok").disabled = !placeOk(); const ok = q.cost ? `✓ ${icon("piece")}${fmt(q.cost)}` : "✓ Poser"; if ($("pok").dataset.h !== ok) { $("pok").innerHTML = ok; $("pok").dataset.h = ok; } }
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
      : ms.map((m) => `<div class="card"><div class="row"><span>${m.name.replace(/</g, "&lt;")}</span><span class="grow"></span><span class="muted">${m.stage ? "étape " + m.stage : "pas d'usine"}</span>${m.stage ? `<button class="btn sm" data-visit="${m.id}" data-name="${m.name.replace(/"/g, "&quot;")}">Visiter</button>` : ""}<button class="btn sm or" data-gift="${m.id}">Offrir</button></div></div>`).join("");
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
      if (e.stalled) h += `<p class="bad">${icon("eclair")} Sans énergie : ${whyNoPower(e)}</p>`;
      if (unlinked(e).length) h += `<p class="bad">${icon("non")} Pas de tapis relié : ${unlinked(e).join(", ")}</p>`;
      if (portsOf(e)?.out) h += machineLaneControls(e, portsOf(e));
      if (portsOf(e) && activeRecipes(e).some((r) => Object.keys(r.in).filter((k) => !madeHere(e, k)).length > 1)) h += `<p class="muted">Les ingrédients peuvent arriver par n'importe quel côté, sauf la sortie : un tapis par ingrédient, et rien ne se bloque.</p>`;
      if (manual(e)) {
        // D'abord ce qu'on peut fabriquer maintenant (avec la machine et le sac), puis, plus bas, toutes les recettes.
        const q = e.queue || [], room = QUEUE_MAX - q.length;
        const line = (r) => `${Object.entries(r.in).map(([k, n]) => itemHTML(k, n)).join("")}<span class="arrow">→</span>${Object.entries(r.out).map(([k, n]) => itemHTML(k, n < 1 ? "~" : n)).join("")}`;
        const can = recs.map((r) => [r, possible(e, r)]).filter(([, n]) => n > 0);
        h += `<h3>${icon("marteau")} Fabriquer</h3>`;
        if (recs.some((r) => Object.keys(r.in).some((k) => !isBase(e, k)))) h += `<p class="muted">S'il manque ${recs.some((r) => r.in.planche) ? "des planches" : "de la peinture"}, la machine en fait d'abord.</p>`;
        h += can.length ? `<div class="card">${can.map(([r, n]) => `<div class="rec ${e.craft && e.craft.id === r.id ? "on" : ""}">${line(r)}<span class="grow"></span><button class="btn sm" data-craft="${r.id}" data-n="1" ${room < 1 ? "disabled" : ""}>+1</button>${n > 1 ? `<button class="btn sm" data-craft="${r.id}" data-n="${Math.min(n, room)}" ${room < 1 ? "disabled" : ""}>×${Math.min(n, room)}</button>` : ""}</div>`).join("")}</div>`
          : `<p class="muted">Rien à fabriquer pour l'instant.</p>`;
        if (q.length) h += `<div class="row"><span class="muted">À faire (${q.length})</span>${q.slice(0, 8).map((id) => { const r = RECIPES[e.name].find((x) => x.id === id); return r ? itemHTML(Object.keys(r.out)[0]) : ""; }).join("")}${q.length > 8 ? "…" : ""}<span class="grow"></span><button class="btn sm rouge" id="clearq">Vider</button></div>`;
        h += `<h3>Recettes</h3><div class="card">${recs.map((r) => `<div class="rec">${line(r)}<small>${(r.t / SPEED[info.stage]).toFixed(1).replace(".", ",")} s</small></div>`).join("")}</div>`;
      } else {
      if (recs.length > 1) {
          // une seule recette à la fois : on touche celle qu'on veut ; les intermédiaires suivent tout seuls
          const out1 = (c) => (c.fam ? itemHTML(c.fam === "boule" ? "@boule_peinte" : c.fam === "finie" ? "@boule_finie" : "@peinture") : itemHTML(Object.keys(c.r.out)[0]));
          const nm = (c) => (c.fam ? { boule:"Boules peintes (toutes couleurs)", finie:"Boules finies (toutes couleurs)", peinture:"Peinture (toutes couleurs)" }[c.fam] || c.r.name : c.r.name);
          h += `<h3>${icon("marteau")} Elle fabrique</h3><div class="grid">${recipeChoices(e.name).map((c) => `<button class="btn tile ${e.recipe === c.id ? "on" : ""}" data-setrecipe="${c.id}"><span class="picbox">${out1(c)}</span><span>${nm(c)}</span></button>`).join("")}</div>`;
          h += `<p class="muted">Ce qu'il lui faut, et ce qu'elle se fait elle-même :</p>`;
        }
        h += `<div class="card">${activeRecipes(e).slice(0, 6).map((r) => `<div class="rec ${e.craft && e.craft.id === r.id ? "on" : ""}">${Object.entries(r.in).map(([k, n]) => itemHTML(k, n)).join("")}<span class="arrow">→</span>${Object.entries(r.out).map(([k, n]) => itemHTML(k, n < 1 ? "~" : n)).join("")}<small>${(r.t / SPEED[info.stage]).toFixed(1).replace(".", ",")} s</small></div>`).join("")}</div>`;
      }
      h += `<div class="row"><span class="muted">Dedans</span>${Object.entries(e.inb).map(([k, n]) => itemHTML(k, n)).join("") || '<span class="muted">vide</span>'}</div>`;
      h += `<div class="row"><span class="muted">Sorti</span>${Object.entries(e.outb).map(([k, n]) => itemHTML(k, n)).join("") || '<span class="muted">rien</span>'}</div>`;
      if (e.craft) h += gauge(e.craft.t / e.craft.dur, e.boost > 0 ? "or" : "vert");
      h += `<div class="row"><button class="btn" id="rotate">${icon("tourner")} Tourner</button>${demolBtn(e)}</div>`;
    } else if (e.kind === "source") {
      const r = RAW[e.gives];
      h += `<h3>${itemHTML(e.gives)} ${e.quarry ? "Carrière" : "Tas"} de ${label(e.gives).toLowerCase()}</h3><p>${Math.floor(e.stock)} unités · se recharge de ${fmtN(r.refill)}/s jusqu'à ${r.cap}.</p>${gauge(Math.min(1, e.stock / r.cap), "bleu")}`;
      if (e.quarry) h += `<p class="muted">Un tas de plus, avec sa goulotte : il verse sur les tapis qui partent de lui. Le marché, lui, remplit le tas d'origine.</p>`
        + `<div class="row" style="flex-wrap:wrap;gap:4px"><span class="muted">Matière</span><span class="grow"></span>${Object.keys(RAW).filter((k) => RAW[k].stage <= S.stage).map((k) => `<button class="btn sm ${e.gives === k ? "on" : ""}" data-qgives="${k}" ${k === "sapin_brut" && sapinQuarryTaken(e) ? "disabled" : ""}>${itemHTML(k)}</button>`).join("")}</div>`
        + (sapinQuarryTaken(e) ? `<p class="muted">Une seule carrière peut donner des sapins.</p>` : "");
      const room = Math.min(Math.floor(e.stock), bagRoom(e.gives));
      h += `<div class="row"><span class="muted">Prendre</span><span class="grow"></span>${[1, 5, 20].map((n) => `<button class="btn sm vert" data-take="${n}" ${room < 1 ? "disabled" : ""}>×${n}</button>`).join("")}</div>`;
      if (Math.floor(e.stock) >= 1 && !bagRoom(e.gives)) h += `<p class="muted">Sac plein : dépose dans un coffre ou une machine.</p>`;
      if (!e.quarry) h += `<div class="row"><span class="muted">Acheter (${fmtN(r.cost)} p l'unité)</span><span class="grow"></span>${[1, 10, 50].map((n) => `<button class="btn sm" data-buy="${e.gives}" data-n="${n}">×${n}</button>`).join("")}</div>`;
      if (e.quarry) h += outControls(e) + `<div class="row">${demolBtn(e)}</div>`;
      else if (S.stage >= 3) h += e.chute ? outControls(e)
        : `<button class="btn or wide" id="chute">${icon("tapis")} Poser une goulotte (${CHUTE_COST} p)</button>`;
    } else if (e.kind === "crank") {
      h += `<h3>Manivelle</h3><p>${e.reserve > 0 ? `Encore ${fmtAway(e.reserve)} de marche (8 h une fois remontée).` : "À l'arrêt."} Touche-la pour la remonter à fond.</p>${gauge(e.reserve / CRANK_MAX, "bleu")}`;
      h += `<p class="muted">Fait tourner les ${CRANK_M} machines à tapis les plus proches (à ${CRANK_R} cases) et tous les tapis en bois autour. En ce moment : ${e.machines || 0} / ${CRANK_M} machine${(e.machines || 0) > 1 ? "s" : ""}.</p>`;
      h += `<div class="row"><button class="btn vert" id="wind">${icon("tourner")} Remonter</button>${demolBtn(e)}</div>`;
    } else if (e.kind === "chest") {
      const inBag = [...new Set(S.bag.filter(Boolean).map((sl) => sl.it))];
      h += `<h3>Coffre</h3><p class="muted">${chestTotal(e)} / 200 objets</p>`;
      h += `<h3>Dans le coffre</h3>`;
      h += Object.keys(e.store).length ? `<div class="card">${Object.entries(e.store).map(([k, n]) => `<div class="rec">${itemHTML(k, n)}<span>${label(k)}</span><span class="grow"></span>${[1, 10].filter((q) => q < n).map((q) => `<button class="btn sm" data-cget="${k}" data-n="${q}">×${q}</button>`).join("")}<button class="btn sm vert" data-cget="${k}" data-n="${n}">Tout</button></div>`).join("")}</div><button class="btn wide" id="cgetall">Tout prendre</button>`
        : `<p class="muted">Vide.</p>`;
      h += `<h3>Dans ton sac</h3>`;
      h += inBag.length ? `<div class="card">${inBag.map((k) => { const n = bagCount(k); return `<div class="rec">${itemHTML(k, n)}<span>${label(k)}</span><span class="grow"></span>${[1, 10].filter((q) => q < n).map((q) => `<button class="btn sm" data-cput="${k}" data-n="${q}">×${q}</button>`).join("")}<button class="btn sm or" data-cput="${k}" data-n="${n}">Tout</button></div>`; }).join("")}</div><button class="btn wide" id="cputall">Tout déposer</button>`
        : `<p class="muted">Ton sac est vide.</p>`;
    } else if (e.kind === "trash") {
      // Poubelle : vider son sac (objet par objet, ou tout d'un coup après confirmation) ; un tapis peut aussi y finir.
      const kinds = [...new Set(S.bag.filter(Boolean).map((sl) => sl.it))];
      h += `<h3>${icon("poubelle")} Poubelle</h3><p>Ce que tu y jettes disparaît pour de bon. Un tapis qui arrive dedans s'y vide aussi.</p>`;
      h += kinds.length
        ? `<div class="card">${kinds.map((it) => `<div class="row">${itemHTML(it, bagCount(it))}<span>${label(it)}</span><span class="grow"></span><button class="btn sm rouge" data-trash="${it}">Jeter</button></div>`).join("")}</div>`
          + `<div class="row"><button class="btn rouge" id="trashall">${icon("poubelle")} ${ui.confirmTrash && performance.now() - ui.confirmTrash < 4000 ? "Sûr ? Tout jeter" : "Vider tout le sac"}</button></div>`
        : `<p class="muted">Ton sac est vide.</p>`;
      if (e.eaten) h += `<p class="muted">Déjà avalé par les tapis : ${fmtN(e.eaten)} objet${e.eaten > 1 ? "s" : ""}.</p>`;
      h += `<div class="row">${demolBtn(e)}</div>`;
    } else if (e.kind === "switch") {
      h += `<h3>${icon("tapis")} Aiguilleur</h3><p>Il fait suivre ce qui arrive, sans rien garder. ${e.filter ? `<b>${label(e.filter)}</b> va tout droit, le reste part sur les côtés.` : "Sans filtre, il partage à parts égales entre tout droit, gauche et droite."}</p>`;
      h += `<p class="muted">Pour changer une ligne de recette sans tout refaire : change le filtre.</p>`;
      h += `<h3>Filtre</h3><div class="row" style="flex-wrap:wrap;gap:4px"><button class="btn sm ${e.filter ? "" : "on"}" data-filter="">Aucun (partager)</button>${SWITCH_FILTERS.map((k) => `<button class="btn sm ${e.filter === k ? "on" : ""}" data-filter="${k}" title="${label(k)}">${itemHTML(iconOf(k))}</button>`).join("")}</div>`;
      if (e.seen) h += `<p class="muted">Dernier passé : ${label(e.seen)}.</p>`;
      h += `<div class="row">${demolBtn(e)}</div>`;
    } else if (e.kind === "extractor") {
      h += `<h3>${itemHTML(e.gives)} Extracteur de ${label(e.gives).toLowerCase()}</h3><p>Pose ${fmtN(e.rate)} objet/s sur le tapis voisin. Demande un poteau électrique à ${POLE_R} cases.</p>`;
      h += `<div class="row"><span class="muted">Matière</span><span class="grow"></span>${Object.keys(RAW).filter((r) => RAW[r].stage <= S.stage).map((r) => `<button class="btn sm ${e.gives === r ? "on" : ""}" data-gives="${r}">${itemHTML(r)}</button>`).join("")}</div>`;
      if (!elecPowered(e)) h += `<p class="bad">${icon("eclair")} Pas de courant : il faut un poteau à ${POLE_R} cases et un générateur avec du bois.</p>`;
      h += `<div class="row"><span class="muted">Débit</span><span class="grow"></span>${[0.1, 0.25, 0.5, 1, 2].map((r) => `<button class="btn sm ${e.rate === r ? "on" : ""}" data-rate="${r}">${fmtN(r)}/s</button>`).join("")}</div>`;
      h += outControls(e);
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
    } else {
      h += `<h3>Caisse d'expédition</h3>`;
      const forSale = {}; for (const sl of S.bag) if (sl && price(sl.it)) forSale[sl.it] = (forSale[sl.it] || 0) + sl.n;
      const items = Object.entries(forSale);
      h += items.length ? `<div class="card">${items.map(([it, n]) => `<div class="row">${itemHTML(it, n)}<span>${label(it)}</span><span class="grow"></span><span class="muted">${icon("piece")}${fmtN(price(it) * n)}</span><button class="btn sm" data-sell="${it}">Vendre</button></div>`).join("")}</div>
        <button class="btn vert wide" id="sellall">Tout vendre · ${icon("piece")}${fmtN(items.reduce((v, [it, n]) => v + price(it) * n, 0))}</button>`
        : `<p class="muted">Rien à vendre dans le sac.</p>`;
      const junk = [...new Set(S.bag.filter((sl) => sl && !price(sl.it)).map((sl) => sl.it))];
      if (junk.length) h += `<h3>${icon("poubelle")} Ne se vend pas</h3><div class="card">${junk.map((it) => `<div class="row">${itemHTML(it, bagCount(it))}<span>${label(it)}</span><span class="grow"></span><button class="btn sm rouge" data-trash="${it}">Jeter</button></div>`).join("")}</div>`;
    }
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
  else if (d.sell && e) sellBag(e, d.sell);
  else if (d.trash) { const it = d.trash, go = () => { const n = bagTake(it, bagCount(it)); if (n) toast(`${n} × ${label(it).toLowerCase()} jeté${n > 1 ? "s" : ""}.`); ui.dirty = true; };
    if (e && e.kind === "trash") doNear(e, go); else go(); } // à la poubelle, le lutin y va d'abord
  else if (d.visit) visit(d.visit, d.name);
  else if (d.gift) offerFlowers(d.gift);
  else if (d.setrecipe && e) e.recipe = d.setrecipe;
  else if (d.oall && e) e.outs = null;
  else if (d.oside && e) {
    const o = { ...(e.outs || {}) };
    if (d.olane === "off") delete o[d.oside]; else o[d.oside] = d.olane === "b" ? "b" : +d.olane;
    e.outs = Object.keys(o).length ? o : null; // plus aucun côté choisi : retour à « tous les côtés »
  }
  else if (d.mlane != null && e && e.kind === "machine") e.outLane = d.mlane === "b" ? "b" : +d.mlane; // la fabrication en cours se termine, la suivante suit la nouvelle recette
  else if (d.filter != null && e && e.kind === "switch") e.filter = d.filter || null;
  else if (d.qgives && e && e.quarry) { if (d.qgives === "sapin_brut" && sapinQuarryTaken(e)) toast("Une seule carrière peut donner des sapins."); else if (e.gives !== d.qgives) { e.gives = d.qgives; e.name = SRC_FILE[d.qgives] || "source_" + d.qgives; e.stock = 0; } }
  else if (d.gives && e) { e.gives = d.gives; e.name = "extractor_" + (SRC_FILE[d.gives] || "source_" + d.gives).replace("source_", ""); }
  else if (d.craft && e) {
    const r = recipeOf(e, d.craft);
    if (r && manual(e) && !e.resV) migrateQueue(e);
    const n = r ? Math.min(+d.n, QUEUE_MAX - (e.queue ||= []).length, possible(e, r)) : 0;
    if (n > 0 && manual(e)) {
      // les intermédiaires qui manquent passent d'abord ; les ingrédients de base sont mis de côté : rien ne peut bloquer
      for (const [p, t] of planFor(e, r, n)) { reserve(e, p, t); for (let k = 0; k < t; k++) e.queue.push(p.id); }
    } else if (n > 0) { for (let k = 0; k < n; k++) e.queue.push(r.id); loadFor(e); }
    else if (r) toast("Pas assez de matériaux pour en demander plus.");
  }
  else ({
    advance, expand, visitback2:comeBack, sellall:() => e && sellBag(e),
    rotate:() => e && rotateEnt(e), demol:() => e && askDemolish(e), upgrade:() => e && upgrade(e),
    clearq:() => { if (!e) return; if (manual(e)) clearQueue(e); else e.queue = []; },
    cgetall:() => e && doNear(e, () => { for (const it of Object.keys(e.store)) chestTake(e, it, e.store[it]); }),
    cputall:() => e && doNear(e, () => { for (const it of new Set(S.bag.filter(Boolean).map((sl) => sl.it))) chestPut(e, it, bagCount(it)); }),
    trashall:() => {
      if (!e || e.kind !== "trash") return;
      if (!(ui.confirmTrash && performance.now() - ui.confirmTrash < 4000)) { ui.confirmTrash = performance.now(); ui.dirty = true; setTimeout(() => { ui.dirty = true; }, 4050); return; }
      ui.confirmTrash = null;
      doNear(e, () => { const n = S.bag.reduce((a, sl) => a + (sl ? sl.n : 0), 0); S.bag = S.bag.map(() => null); if (n) toast(`${n} objet${n > 1 ? "s" : ""} jeté${n > 1 ? "s" : ""}.`); ui.dirty = true; });
    },
    wind:() => e && e.kind === "crank" && doNear(e, () => interact(e, true)),
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
$("visitgift").addEventListener("click", () => S.visitId && offerFlowers(S.visitId));
$("tutonext").addEventListener("click", () => ui.tour && tourShow(ui.tour.key, ui.tour.i + 1));
$("tutoskip").addEventListener("click", () => (ui.tour ? tourShow(ui.tour.key, Infinity) : tourShow(null)));
$("tuto").addEventListener("click", (ev) => { const k = ev.target.closest("[data-tour]")?.dataset.tour; if (k) { ui.newsFrom = 0; tourShow(k === "start" || k === "news" ? k : +k); } });
$("help").addEventListener("click", () => { if (!S.visit) tourPick(); });
$("prot").addEventListener("click", rotatePlace);
$("pok").addEventListener("click", confirmPlace);
$("pno").addEventListener("click", cancelPlace);
$("pdel").addEventListener("click", removePlace);
$("beltdone").addEventListener("click", () => setMode("hand"));
$("zin").addEventListener("click", () => zoomStep(1));
$("zout").addEventListener("click", () => zoomStep(-1)); // jusqu'à 0,5 : toute l'usine à l'écran

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
  // l'accessoire choisi dans la salle ; sans accessoire, le bonnet de Noël
  const ac = q.get("ac"), acc = ACCESSORIES.includes(ac) ? ac : "santa";
  if (sp && SPECIES.includes(sp)) S.avatar = { species:sp, color:Math.max(0, Math.min(7, +q.get("co") || 0)), acc };
}
// ---------------------------------------------------------------- sauvegarde
// Tant que la partie du serveur n'est pas chargée, on n'enregistre rien (sinon une partie neuve pourrait écraser la vraie).
let synced = !API;
function save() { if (S.demo || S.visit || catching || !synced) return; S.savedAt = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} }
/** Envoie la partie au serveur (sans effet hors d'une salle ou tant que la table n'existe pas). */
function push() {
  if (!API || S.demo || S.visit || catching || !synced) return;
  save(); const body = JSON.stringify(S);
  fetch(API, { method:"PUT", body, keepalive:body.length < 60000, headers:{ "content-type":"application/json" } })
    .then((r) => { if (r.status === 409) { synced = false; pull(true); } }) // le serveur a une partie plus avancée : on la reprend
    .catch(() => {});
}
/** Charge la partie du serveur si elle est plus récente que celle de l'appareil, puis rattrape le temps passé. */
async function pull(again) {
  if (API) try {
    const r = await fetch(API, { cache:"no-store" });
    // on garde la partie la plus avancée (temps de jeu), pas la plus récemment enregistrée
    if (r.ok) { const { state } = await r.json(); if (state && state.v === 2 && state.area && ((state.time || 0) > (S.time || 0) || again)) { S = state; dropGone(S); useCharacter(); ensureFlowerbed(); invalidate(); camReady = false; ui.sel = null; ui.dirty = true; } }
  } catch {}
  synced = true;
  if (again) toast("Ta partie a été récupérée depuis le serveur.");
  catchUp();
}
// ---- Tutoriel guidé : une phrase par étape ; il ouvre lui-même les menus (hi = élément à montrer) et montre les objets (ent).
const firstOf = (kind) => S.ents.find((e) => e.kind === kind);
// Visite du début (étape 1). Mise à jour à chaque nouveauté : rien de ce que le joueur peut faire ne doit y manquer.
const TUTO = [
  { t:"Bienvenue à l'usine des lutins ! Fabrique des décorations de Noël, vends-les et fais grandir ton usine.", go:() => { closePanel(); setIcons(false); } },
  { t:"Touche un tas de matières : ton lutin y va et remplit son sac. Le tas se recharge tout seul, et le marché en vend aussi.", ent:() => firstOf("source"), go:() => { closePanel(); setIcons(false); } },
  { t:"Touche une machine : sa fiche s'ouvre, choisis ce qu'elle fabrique (+1, ou plus d'un coup). S'il manque un intermédiaire (la peinture d'une boule), elle le fait d'abord.", ent:() => firstOf("machine"), go:() => { const m = firstOf("machine"); if (m) select(m); } },
  { t:"La caisse d'expédition : choisis ce que tu vends contre des pièces. Ce qui ne se vend pas peut s'y jeter.", ent:() => firstOf("crate"), go:() => { const c = firstOf("crate"); if (c) select(c); } },
  { t:"Ta serre de l'usine : plante, attends 2 h, et récolte 3 fleurs. Tu peux les offrir aux autres joueurs.", ent:() => firstOf("flowerbed"), go:() => { const b = firstOf("flowerbed"); if (b) select(b); } },
  { t:"Ton sac, en bas : tout ce que ton lutin porte. Plein ? Range dans un coffre, ou pose une poubelle (Construire) pour le vider.", hi:"#bagwrap", go:() => closePanel() },
  { t:"Appui long sur un objet pour le déplacer et le tourner. Garde le doigt sur le sol pour marcher.", go:() => closePanel() },
  { t:"Glisse à deux doigts pour regarder ailleurs, pince pour zoomer (sur ordinateur : molette et clic droit). Le bouton − va jusqu'à montrer toute l'usine.", hi:"#zout", go:() => { closePanel(); setIcons(true); } },
  { t:"Pour démonter, touche deux fois l'objet (mode Démonter, ou bouton de sa fiche) : la moitié du prix revient, et ce que contenait une machine retourne dans ton sac. Un coffre se vide d'abord.", go:() => closePanel() },
  { t:"Le menu ☰ : le zoom et toutes les pages.", hi:"#menubtn", go:() => { closePanel(); setIcons(true); } },
  { t:"Commandes du jour : de vraies pièces pour la salle (boosters, questions). Plus bas : passer à l'étape suivante.", hi:'[data-page="commandes"]', go:() => page("commandes") },
  { t:"Le marché : achète des matières pour aller plus vite.", hi:'[data-page="marche"]', go:() => page("marche") },
  { t:"Construire : machines, coffres, poubelle, serres, et agrandir l'atelier.", hi:'[data-page="construire"]', go:() => page("construire") },
  { t:"Visiter : regarde l'usine des autres joueurs (glisse d'un doigt pour la parcourir) et offre-leur des fleurs. Les cadeaux reçus s'ouvrent quand tu arrives ici.", hi:'[data-page="visiter"]', go:() => page("visiter") },
  { t:"Ton usine continue quand tu n'es pas là. Chaque nouvelle étape aura sa visite, et le bouton i permet de tout revoir. Joyeux Noël !", hi:"#help", go:() => { closePanel(); setIcons(true); } },
];
function setIcons(on) { document.body.classList.toggle("menu", on); $("menubtn").textContent = on ? "✕" : "☰"; }
function page(tab) { setIcons(true); ui.tab = tab; if (tab === "visiter") loadMembers(); openPanel(); ui.dirty = true; }
// ---- Visites guidées : celle du début (TUTO), puis une à chaque nouvelle étape (STAGE_TOURS), qui se lance au passage
// d'étape (et une fois pour ceux qui y sont déjà). Une étape « mission » (need) attend que ce soit fait : elle se coche toute seule.
const named = (n) => S.ents.find((e) => e.name === n);
const pileOf = (raw) => S.ents.find((e) => e.kind === "source" && e.gives === raw);
const beltMachines = (pw) => S.ents.filter((e) => e.kind === "machine" && MACH[e.name].power === pw);
/** L'objet est-il quelque part : sac, coffres, sortie d'une machine ? */
const have = (it) => bagCount(it) > 0 || S.ents.some((e) => (e.kind === "chest" && e.store[it]) || (e.kind === "machine" && e.outb[it]));
const STAGE_TOURS = {
  2:[
    { t:"Étape 2 ! De nouveaux tas sont arrivés : bois, fil et sapins bruts. Les machines restent à la main : tu leur demandes ce qu'elles fabriquent.", ent:() => pileOf("bois"), go:() => closePanel() },
    { t:"Une machine se rend plus rapide avec « Améliorer », dans sa fiche : le four devient un four à soufflet.", ent:() => firstOf("machine"), go:() => { const m = firstOf("machine"); if (m) select(m); } },
    { t:"À toi : construis un tour à bois (page Construire). Avec du bois, il fait des planches, puis des étoiles en bois.", need:() => !!named("lathe"), go:() => page("construire") },
    { t:"À toi : fabrique une étoile en bois au tour. Demande-la directement : il fait d'abord les planches qui manquent.", need:() => have("etoile_bois"), ent:() => named("lathe"), go:() => closePanel() },
    { t:"La table à couronnes (Construire) : 4 branches et 2 boules peintes font une couronne.", go:() => page("construire") },
    { t:"À toi : construis l'établi à sapins. 1 sapin brut, 4 boules peintes et 1 étoile en bois donnent un sapin décoré, ce qui se vend le plus cher.", need:() => !!named("tree_bench"), go:() => page("construire") },
    { t:"Pour passer à l'étape 3 : page Commandes, tout en bas. Bonne fabrication !", hi:'[data-page="commandes"]', go:() => page("commandes") },
  ],
  3:[
    { t:"Étape 3 ! Les machines à tapis fabriquent toutes seules, tant qu'elles reçoivent leurs ingrédients par tapis et qu'une manivelle les fait tourner.", go:() => closePanel() },
    { t:"Un tapis a deux voies, une de chaque côté. Trace-le en glissant le doigt (Construire, Tapis). Un tapis qui arrive sur le côté d'un autre y dépose sur la voie de ce côté.", go:() => page("construire") },
    { t:"À toi : pose une goulotte sur le tas de sable (touche le tas, puis « Poser une goulotte »). Le tas versera sur les tapis qui le touchent.", need:() => !!pileOf("sable")?.chute, ent:() => pileOf("sable"), go:() => { const sb = pileOf("sable"); if (sb) select(sb); } },
    { t:"Dans la fiche du tas, « Elle verse vers » : choisis le côté (sinon il remplit tous les tapis qui le touchent), puis la voie, même celle d'en face. Une flèche dorée montre le côté.", ent:() => pileOf("sable"), go:() => { const sb = pileOf("sable"); if (sb) select(sb); } },
    { t:"À toi : construis un four à tapis (page Construire), ou améliore ton four à soufflet.", need:() => !!named("kiln_belt"), go:() => page("construire") },
    { t:"À toi : trace un tapis du tas de sable jusqu'au four. Il peut entrer par n'importe quel côté, sauf la sortie.", need:() => beltMachines(true).some((m) => m.name === "kiln_belt" && feeders(m).length), ent:() => named("kiln_belt"), go:() => closePanel() },
    { t:`À toi : pose une manivelle à ${CRANK_R} cases au plus du four, puis touche-la : remontée en un geste, elle tient 8 h, même quand tu n'es pas là. Elle fait tourner ${CRANK_M} machines et tous les tapis en bois autour.`, need:() => beltMachines(true).some((m) => m.name === "kiln_belt" && powered.has("m" + m.id)), ent:() => named("kiln_belt"), go:() => page("construire") },
    { t:"À toi : relie la sortie du four à la caisse d'expédition par un tapis. Les boules s'y vendent toutes seules.", need:() => beltMachines(true).some((m) => m.name === "kiln_belt" && !unlinked(m).includes("sortie")), ent:() => firstOf("crate"), go:() => closePanel() },
    { t:"Une machine à tapis fabrique une seule recette : dans sa fiche, « Elle fabrique », touche celle que tu veux (ou « toutes couleurs »). Elle se fait seule ses intermédiaires.", ent:() => named("kiln_belt"), go:() => { const m = named("kiln_belt"); if (m) select(m); } },
    { t:"Deux ingrédients ? Un tapis pour chacun, par deux côtés : le métier à tisser prend le fil d'un côté et les perles de l'autre. (Pour des rubans, règle une table de peinture sur « Peinture ».)", go:() => page("construire") },
    { t:"Plus de sable ? Construis une carrière : un tas de plus, posé où tu veux, avec sa goulotte (matière et côté au choix dans sa fiche). Une carrière par ligne, et le sable ne manque plus. Chacune coûte 1,5 fois plus que la précédente, et une seule peut donner des sapins.", go:() => page("construire") },
    { t:"Un aiguilleur partage un tapis entre plusieurs lignes. Avec un filtre, il trie : l'objet choisi va tout droit, le reste part sur les côtés. Collé à la sortie d'une machine, il prend ce qu'elle fait. Pour changer une ligne, change juste le filtre.", go:() => page("construire") },
    { t:"Une ligne déborde ? Un tapis qui finit dans une poubelle s'y vide.", go:() => page("construire") },
    { t:"Ensuite, ajoute des machines à la chaîne (peinture, presse…). Si une machine s'arrête, sa fiche dit pourquoi (ingrédient qui manque, énergie, tapis non relié).", go:() => closePanel() },
  ],
  4:[
    { t:"Étape 4 : la vapeur ! Les machines à vapeur vont 1,5 fois plus vite, et une chaudière remplace les manivelles.", go:() => closePanel() },
    { t:`À toi : construis une chaudière. Elle fait tourner les ${BOILER_N} machines à vapeur les plus proches, à ${BOILER_R} cases au plus.`, need:() => !!firstOf("boiler"), go:() => page("construire") },
    { t:"À toi : donne-lui du bois. À la main ça marche, mais une goulotte sur le tas de bois et un tapis jusqu'à elle la font tourner sans fin.", need:() => S.ents.some((e) => e.kind === "boiler" && e.fuel > 0), ent:() => firstOf("boiler"), go:() => closePanel() },
    { t:"À toi : fais tourner une machine à vapeur près de la chaudière (« Améliorer » dans la fiche d'une machine à tapis : elle garde sa recette ; ou Construire).", need:() => beltMachines("steam").some((m) => powered.has("m" + m.id)), ent:() => firstOf("boiler"), go:() => closePanel() },
    { t:"Les tapis en fonte vont deux fois plus vite que le bois, et tournent sans manivelle : mets-les sur les lignes qui débordent.", go:() => page("construire") },
    { t:"Avec du bois amené par tapis, ton usine tourne même quand tu n'es pas là, sans rien remonter.", go:() => closePanel() },
  ],
  5:[
    { t:`Étape 5 : l'électricité ! Un générateur au bois alimente ${GEN_N} appareils électriques, reliés par des poteaux.`, go:() => closePanel() },
    { t:"À toi : construis un générateur. Il peut être n'importe où : c'est le réseau de poteaux qui amène le courant.", need:() => !!firstOf("generator"), go:() => page("construire") },
    { t:"À toi : donne-lui du bois (par tapis, c'est mieux).", need:() => S.ents.some((e) => e.kind === "generator" && e.fuel > 0), ent:() => firstOf("generator"), go:() => closePanel() },
    { t:`À toi : fais tourner une machine électrique (« Améliorer », ou Construire) avec un poteau à ${POLE_R} cases au plus d'elle.`, need:() => beltMachines("elec").some((m) => elecPowered(m)), go:() => page("construire") },
    { t:"Les extracteurs produisent une matière tout seuls, sans tas ni marché : dans leur fiche, choisis la matière, le débit, et le côté où ils versent (comme une goulotte).", go:() => page("construire") },
    { t:"Les tapis en métal vont 4 fois plus vite que le bois. Joyeux Noël !", go:() => closePanel() },
  ],
};
// Nouveautés, montrées une fois à ceux qui avaient déjà fait la visite du début (min : étape à partir de laquelle ça compte).
// Pour annoncer une prochaine mise à jour : augmenter NEWS_V et ajouter ses bulles avec v:NEWS_V.
// Au lancement, un joueur ne voit que les bulles plus récentes que sa dernière visite ; le menu les montre toutes.
const NEWS_V = 2;
const NEWS = [
  { v:0, t:"Du nouveau à l'usine ! Voici ce qui a changé, en quelques bulles.", go:() => closePanel() },
  { t:"La vue bouge : glisse à deux doigts, pince pour zoomer (molette et clic droit sur ordinateur). Le bouton − montre toute l'usine.", hi:"#zout", go:() => { closePanel(); setIcons(true); } },
  { t:"Une poubelle (Construire) vide ton sac. Un tapis qui y finit s'y vide aussi.", go:() => page("construire") },
  { t:"Les fleurs s'offrent de nouveau : page Visiter, « Offrir », ou pendant une visite. Les cadeaux reçus s'ouvrent à ton arrivée.", hi:'[data-page="visiter"]', go:() => page("visiter") },
  { t:"Démonter se confirme : touche deux fois. Et ce que contenait une machine revient dans ton sac.", go:() => closePanel() },
  { t:"Demande directement des boules peintes ou une étoile en bois : la machine fait d'abord la peinture ou les planches.", ent:() => firstOf("machine"), go:() => closePanel() },
  { min:3, t:"La manivelle se remonte en un geste et tient 8 h, même quand tu n'es pas là. Elle fait tourner tous les tapis en bois autour.", go:() => closePanel() },
  { min:3, t:"Une goulotte ne verse plus partout : dans la fiche du tas, choisis le côté et la voie (même celle d'en face).", ent:() => pileOf("sable"), go:() => closePanel() },
  { min:3, t:"Les machines à tapis prennent leurs ingrédients par n'importe quel côté (sauf la sortie), et fabriquent UNE recette, que tu choisis dans leur fiche.", go:() => closePanel() },
  { min:3, t:"Nouveau dans Construire : la carrière (un tas de plus, où tu veux) et l'aiguilleur (il partage un tapis, ou trie avec un filtre).", go:() => page("construire") },
  { v:2, min:3, t:"Une carrière peut verser de plusieurs côtés, chacun sur la voie de ton choix. Et une machine à tapis pose ce qu'elle fait sur la voie choisie dans sa fiche.", go:() => closePanel() },
  { v:2, min:3, t:"Nouveaux prix : la guirlande se vend 11, l'étoile dorée 6. La machine à couronnes à tapis fait la couronne décorée (même recette), vendue 26 ; la couronne simple reste à 15.", go:() => closePanel() },
  { v:2, min:3, t:"Chaque carrière coûte 1,5 fois plus que la précédente, et une seule peut donner des sapins.", go:() => page("construire") },
];
const TOURS = { start:TUTO, ...STAGE_TOURS };
/** Les bulles d'une visite (les nouveautés : seulement celles des étapes atteintes). */
const tourList = (key) => (key === "news" ? NEWS.filter((x) => (x.min || 1) <= S.stage && (x.v === 0 || (x.v || 1) > (ui.newsFrom || 0))) : TOURS[key]);
const curStep = () => ui.tour && tourList(ui.tour.key)?.[ui.tour.i];
/** Montre l'étape i de la visite `key` ; au-delà de la dernière (ou key null), la visite se ferme et compte comme vue. */
function tourShow(key, i = 0) {
  document.querySelectorAll(".tuto-hi").forEach((el) => el.classList.remove("tuto-hi"));
  const list = key != null && tourList(key);
  if (!list || i >= list.length) {
    const was = ui.tour?.key;
    if (ui.tour) {
      if (was === "start") { S.tutoDone = true; S.newsSeen = NEWS_V; } // un nouveau joueur a déjà tout vu dans la visite du début
      else if (was === "news") S.newsSeen = NEWS_V;
      else (S.toursDone ||= {})[was] = true;
      save();
    }
    ui.tour = null; $("tuto").hidden = true; ui.dirty = true;
    if (was === "news") setTimeout(tutoAuto, 400); // puis la visite de son étape, s'il ne l'a pas vue
    return;
  }
  ui.tour = { key, i }; const st = list[i]; st.go?.();
  $("tutotext").textContent = st.t; $("tutonext").hidden = false; $("tutoskip").textContent = "Passer";
  if (st.hi) document.querySelector(st.hi)?.classList.add("tuto-hi");
  tourRefresh(); $("tuto").hidden = false; ui.dirty = true;
}
/** À chaque rendu du volet : la mission en cours se coche dès qu'elle est faite. */
function tourRefresh() {
  const st = curStep(); if (!st) return;
  const list = tourList(ui.tour.key), last = ui.tour.i === list.length - 1, done = !st.need || st.need();
  $("tutostep").textContent = `${ui.tour.i + 1} / ${list.length}` + (st.need ? (done ? " · ✓ fait !" : " · à toi de jouer") : "");
  $("tutonext").disabled = !done;
  $("tutonext").textContent = last ? "C'est parti !" : "Suivant";
}
/** Le bouton d'aide : revoir les bases, ou la visite d'une étape déjà atteinte. */
function tourPick() {
  if (S.stage < 2 && (S.newsSeen || 0) >= NEWS_V) return tourShow("start");
  ui.tour = null; document.querySelectorAll(".tuto-hi").forEach((el) => el.classList.remove("tuto-hi"));
  const opts = [`<button class="btn sm" data-tour="start">Les bases</button>`, `<button class="btn sm" data-tour="news">Nouveautés</button>`,
    ...Object.keys(STAGE_TOURS).filter((k) => +k <= S.stage).map((k) => `<button class="btn sm" data-tour="${k}">Étape ${k} : ${STAGE_NAMES[k]}</button>`)];
  $("tutotext").innerHTML = `Que veux-tu revoir ?<span class="row" style="flex-wrap:wrap;gap:4px;margin-top:4px">${opts.join("")}</span>`;
  $("tutostep").textContent = ""; $("tutonext").hidden = true; $("tutoskip").textContent = "Fermer"; $("tuto").hidden = false;
}
/** À l'ouverture : la visite du début si elle n'a pas été faite, sinon celle de l'étape où l'on est, une fois. */
function tutoAuto() {
  if (S.demo || S.visit) return;
  if (catching) return setTimeout(tutoAuto, 500);
  if (!S.tutoDone) return tourShow("start");
  if ((S.newsSeen || 0) < NEWS_V) { ui.newsFrom = S.newsSeen || 0; return tourShow("news"); } // déjà joueur : d'abord ce qui a changé
  if (STAGE_TOURS[S.stage] && !S.toursDone?.[S.stage]) tourShow(S.stage);
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
    S = j.state; dropGone(S); S.visit = name; S.visitId = id; S.simAt = S.simAt || S.savedAt || j.savedAt; invalidate(); camReady = false; ui.sel = null; ui.place = null; closePanel();
    // toute son usine à l'écran (on la fait glisser d'un doigt, on zoome en pinçant) ; on retrouvera son zoom en rentrant
    if (ui.zoomBack == null) ui.zoomBack = zoom;
    zoom = fitAll(); cam.x = S.area.w * T / 2 - cssW / zoom / 2; cam.y = S.area.h * T / 2 - cssH / zoom / 2; camReady = true; camFree = true;
    $("visitname").textContent = `Usine de ${name}`; $("visitbar").hidden = false; ui.dirty = true;
    catchUp(); // elle a continué de tourner depuis que son propriétaire est parti
  } catch { toast("Visite impossible pour l'instant."); }
}
/** Offrir des fleurs à un membre : c'est l'app autour du jeu qui ouvre la fenêtre (comme dans l'ancienne serre). */
function offerFlowers(id) {
  if (!API || window.parent === window) return toast("Ouvre l'usine depuis ta salle pour offrir des fleurs.");
  window.parent.postMessage({ type:"usine:gift", to:id }, location.origin);
}
// l'app prévient quand un cadeau est parti (ses fleurs ont quitté l'inventaire) : la fiche de la serre se met à jour
window.addEventListener("message", (ev) => { if (ev.origin === location.origin && ev.source === window.parent && ev.data?.type === "usine:flowers") loadFlowers(); });
function comeBack() {
  if (!mine) return;
  if (catching) return toast("Un instant, l'usine se met à jour…");
  S = mine; mine = null; invalidate(); camReady = false; camFree = false; camEase = false; ui.sel = null; $("visitbar").hidden = true; closePanel(); ui.dirty = true;
  if (ui.zoomBack != null) { zoom = ui.zoomBack; ui.zoomBack = null; }
  catchUp(); // ton usine a tourné pendant la visite
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
let catching = false, crafted = 0; // crafted : fabrications terminées (pour le résumé du rattrapage)
const fmtAway = (sec) => (sec >= 3600 ? `${Math.floor(sec / 3600)} h ${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}` : `${Math.floor(sec / 60)} min`);
/** Fait tourner l'usine pour le temps écoulé depuis la dernière sauvegarde, par paquets (l'écran reste réactif), puis résume. */
function catchUp() {
  if (S.demo || catching) return;
  if (!S.simAt) S.simAt = S.savedAt || Date.now(); // vieille partie : on part de sa dernière sauvegarde
  const away = Math.min(OFFLINE_MAX, (Date.now() - S.simAt) / 1000);
  if (away < 30) return;
  catching = true;
  const box = $("catchup"), coins0 = S.coins, made0 = crafted, sold0 = S.sales.length, n = Math.round(away / OFF_DT);
  box.hidden = false;
  let i = 0;
  const chunk = () => {
    const end = Math.min(n, i + 4000);
    for (; i < end; i++) step(OFF_DT);
    $("catchbar").style.width = `${Math.round((100 * i) / n)}%`;
    if (i < n) return setTimeout(chunk, 0);
    box.hidden = true; catching = false; S.simAt = Date.now();
    if (S.visit) { toast(`L'usine de ${S.visit} a tourné ${fmtAway(away)} depuis sa dernière visite.`, 5000); ui.dirty = true; return; } // en visite : on montre, on n'enregistre rien
    save(); push();
    const h = fmtAway(away);
    const earned = S.coins - coins0, made = crafted - made0;
    const done = [made && `${fmt(made)} fabrication${made > 1 ? "s" : ""} terminée${made > 1 ? "s" : ""}`, earned > 0 && `+${fmt(earned)} pièces`].filter(Boolean);
    toast(done.length ? `Pendant ton absence (${h}) : ${done.join(", ")}.` : `Pendant ton absence (${h}) : rien n'a tourné. Lance des fabrications avant de partir !`, 7000);
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
load(); dropGone(S); useCharacter(); ensureFlowerbed();
setInterval(save, 4000); setInterval(() => { if (!document.hidden) push(); }, 20000); // onglet caché : l'usine ne tourne pas, rien de neuf à envoyer
window.addEventListener("beforeunload", push);
// onglet caché : on enregistre ; de retour : l'usine rattrape le temps passé
document.addEventListener("visibilitychange", () => { if (document.hidden) push(); else catchUp(); });
// Ouverte depuis l'accueil sur un membre (?visit=<id>) : une fois sa propre partie chargée et à jour, on visite son usine.
const VISIT = new URLSearchParams(location.search).get("visit");
pull().then(async () => {
  if (!VISIT) return;
  while (catching) await new Promise((r) => setTimeout(r, 300));
  await loadMembers();
  const m = (ui.members || []).find((x) => x.id === VISIT);
  if (m) visit(m.id, m.name);
});
new ResizeObserver(() => resize()).observe(cv.parentElement);
resize(); fitZoom();
setTimeout(tutoAuto, 1200); // première visite : le tutoriel
document.fonts?.load('8px "Chaumiere Pixel"');
requestAnimationFrame(tick);
window.__usine = { get S() { return S; }, get zoom() { return zoom; }, get cam() { return { ...cam, free:camFree }; }, step, place, advance, sell, interact, buy, byId, entAt, computePower, bagAdd };
})();
