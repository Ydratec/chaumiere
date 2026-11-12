// Usine de Noël — prototype v2 (étapes 1 à 3), sur le gameplay validé :
// tout à la main au début (tas de matières, sac, four et table), marché pour acheter, puis tapis à deux voies sans bras.
// Logique (état, recettes, tapis) séparée du rendu (canvas) et de l'interface (DOM), pour être portée en TypeScript dans Chaumière.
(() => {
"use strict";
const META = window.USINE_META;
const T = 32, W = 24, H = 18, Y0 = 2;
const SAVE_KEY = "usine-proto-v2";

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
const RAW_X = { sable:1, branche:3, pigment_rouge:5, pigment_vert:6, pigment_or:7, pigment_bleu:8, bois:11, fil:13, sapin_brut:15 };
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
RECIPES.tree_decorator = [{ id:"sapin", name:"Sapin décoré", in:{ sapin_brut:1, "@boule_finie":6, guirlande:1, etoile_doree:1 }, out:{ sapin_decore:1 }, t:6 }];
const MACH = {
  kiln:{ stage:1, name:"Four à boules" }, paint_table:{ stage:1, name:"Table de peinture" }, wreath_table:{ stage:1, name:"Table à couronnes" },
  kiln_bellows:{ stage:2, name:"Four à soufflet" }, lathe:{ stage:2, name:"Tour à bois" }, tree_bench:{ stage:2, name:"Établi à sapins" },
  kiln_belt:{ stage:3, name:"Four à tapis", power:true }, paint_table_belt:{ stage:3, name:"Peinture à tapis", power:true },
  star_press:{ stage:3, name:"Presse à manivelle", power:true }, loom:{ stage:3, name:"Métier à tisser", power:true },
  wreath_table_belt:{ stage:3, name:"Couronnes à tapis", power:true },
  elec_furnace:{ stage:5, name:"Four à induction", power:"elec" }, paint_booth:{ stage:5, name:"Cabine de peinture", power:"elec" },
  assembler:{ stage:5, name:"Assembleur", power:"elec" }, elec_loom:{ stage:5, name:"Métier électrique", power:"elec" },
  elec_wreath:{ stage:5, name:"Machine à couronnes", power:"elec" }, tree_decorator:{ stage:5, name:"Décoratrice électrique", power:"elec" },
};
const SPEED = { 1:0.5, 2:0.75, 3:1, 4:1.5, 5:2 };
const BUILD = {   // [clé, coût, nom affiché si ce n'est pas une machine]
  1:[["kiln", 180], ["paint_table", 180], ["chest_wood", 60, "Coffre"]],
  2:[["wreath_table", 400], ["lathe", 830], ["tree_bench", 830], ["kiln_bellows", 830]],
  3:[["belt", 5, "Tapis en bois"], ["crank", 400, "Manivelle"], ["kiln_belt", 4700], ["paint_table_belt", 4700], ["star_press", 4700], ["loom", 4700], ["wreath_table_belt", 4700]],
};
const GATES = { 2:{ coins:50 }, 3:{ coins:20610, rate:{ key:"@boule_peinte", per_min:1 } } };
const STAGE_NAMES = { 1:"Atelier du lutin", 2:"Atelier équipé", 3:"Petite fabrique", 4:"Manufacture à vapeur", 5:"Usine électrique" };
const TILESET = { 1:["floor_wood", "wall_log"], 2:["floor_wood", "wall_log"], 3:["floor_wood", "wall_log"], 4:["floor_stone", "wall_brick"], 5:["floor_concrete", "wall_metal"] };
const BELT_SPEED = { bois:0.5, fonte:1, metal:2 };      // cases/s : 1, 2 et 4 objets/s par voie
const POLE_R = 4;
const UNLOCK_TEXT = { 2:"Bois, fil et sapins ; table à couronnes, tour à bois, établi à sapins, four à soufflet.",
  3:"Tapis à deux voies, goulottes sur les tas, manivelles et machines à tapis." };
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
    player:{ x:10, y:8, px:10, py:8, path:[], dir:"down", work:0, job:null },
    contracts:[], sales:[], stats:{}, test:false, avatar:{ species:"cat", color:0, santa:true } };
  addEnt({ kind:"crate", name:"ship_crate", stage:1, x:21, y:2 });
  addEnt({ kind:"chest", name:"chest_wood", stage:1, x:19, y:2, o:"e", store:{} });
  addEnt({ kind:"deco", name:"deco_tree", stage:1, x:23, y:3 });
  addEnt({ kind:"rug", name:"deco_rug", stage:1, x:11, y:10 });
  addSources(1);
  addEnt({ kind:"machine", name:"kiln", stage:1, x:2, y:6, o:"e" });
  addEnt({ kind:"machine", name:"paint_table", stage:1, x:6, y:6, o:"e" });
  for (let i = 0; i < 3; i++) newContract();
}
function addSources(stage) {
  for (const raw in RAW) if (RAW[raw].stage === stage)
    addEnt({ kind:"source", name:SRC_FILE[raw] || "source_" + raw, gives:raw, stage, x:RAW_X[raw], y:2, stock:RAW[raw].cap, chute:false, acc:0, lane:0 });
}
function addEnt(e) {
  e.id = S.ids++;
  if (e.kind === "machine") Object.assign(e, { inb:{}, outb:{}, craft:null, boost:0, recipe:e.recipe || "auto", color:e.color || null, lane:0 });
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
const inFloor = (x, y) => x >= 0 && x < W && y >= Y0 && y < H;
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
function activeRecipes(m) {
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
function updateMachine(m, dt) {
  const info = MACH[m.name];
  if (!m.craft) {
    const r = activeRecipes(m).find((r) => canCraft(m, r));
    if (r) { for (const k in r.in) consume(m, k, r.in[k]); m.craft = { id:r.id, t:0, dur:r.t / SPEED[info.stage] }; }
  }
  if (m.craft) {
    if (info.power === true ? !powered.has("m" + m.id) : info.power === "elec" ? !elecPowered(m) : false) m.stalled = true;
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
function elecPowered(e) {   // réseau électrique : un générateur dans l'usine et un poteau à 4 cases au plus
  return S.ents.some((g) => g.kind === "generator") && S.ents.some((p) => p.kind === "pole" && distTo(e, p.x, p.y) <= POLE_R);
}
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
    s.acc = Math.min(1, (s.acc || 0) + dt * (ext ? s.rate : CHUTE_RATE)); if (s.acc < 1) continue;
    for (const [side, [dx, dy]] of Object.entries(DIRS)) {
      const b = S.belts[(s.x + dx) + "," + (s.y + dy)];
      if (!b || !b.on || b.d === OPP[side]) continue;
      const from = OPP[side];                          // côté du tapis où se trouve la source
      const lane = from === b.d || from === OPP[b.d] ? (s.lane || 0) : from === LEFT[b.d] ? 0 : 1;
      const at = from === OPP[b.d] ? 0 : 0.5;
      if (!laneRoom(b, lane, at)) continue;
      b.lanes[lane].push({ it:s.gives, p:at }); if (chute) s.stock--; s.acc = 0; s.lane = 1 - (s.lane || 0); break;
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
  if (g.rate) { const r = rateOf(g.rate.key); parts.push({ text:`Boules peintes vendues : ${r.toFixed(1)} / ${g.rate.per_min} par min`, frac:Math.min(1, r / g.rate.per_min) }); }
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
  if (e.kind === "source") {
    if (S.stage >= 3 && e.chute && first) { select(e); }
    if (e.stock < 1) { if (first) toast(`Tas de ${label(e.gives).toLowerCase()} vide : il se recharge, ou achète au marché.`); return; }
    if (!bagRoom(e.gives)) { if (first) toast("Sac plein"); return; }
    ui.harvest += first ? 1 : 0.25 * HARVEST_PER_S;
    while (ui.harvest >= 1 && e.stock >= 1 && bagRoom(e.gives)) { ui.harvest -= 1; e.stock -= 1; bagAdd(e.gives, 1); }
    p.work = 0.3; return;
  }
  if (e.kind === "crate") {
    let v = 0;
    for (let i = 0; i < BAG; i++) { const s = S.bag[i]; if (s && price(s.it)) { v += price(s.it) * s.n; sell(s.it, s.n); S.bag[i] = null; } }
    if (v) { fx(e.x * T + 16, e.y * T, "+" + fmtN(v), "#ffd65a"); p.work = 0.3; }
    else if (first) toast("La caisse achète les produits finis : rien à vendre dans le sac.");
    return;
  }
  if (e.kind === "chest") {
    if (!first) return;
    if (S.bag.some(Boolean)) { for (let i = 0; i < BAG; i++) { const s = S.bag[i]; if (s) { const k = chestAdd(e, s.it, s.n); s.n -= k; if (!s.n) S.bag[i] = null; } } }
    else for (const it of Object.keys(e.store)) { const k = bagAdd(it, e.store[it]); e.store[it] -= k; if (!e.store[it]) delete e.store[it]; }
    p.work = 0.3; select(e, true); return;
  }
  if (e.kind === "crank") { e.reserve = Math.min(CRANK_MAX, e.reserve + (first ? CRANK_WIND : CRANK_WIND / 4)); p.work = 0.4; return; }
  if (e.kind === "extractor" || e.kind === "generator" || e.kind === "pole") { if (first) select(e); return; }
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
    if (!moved && !e.craft) toast(e.stalled ? "Pas d'énergie : remonte une manivelle à côté." : `${MACH[e.name].name} : il manque ${missing(e).join(", ") || "de la place en sortie"}.`);
  }
}
function updatePlayer(dt) {
  const p = S.player;
  if (p.work > 0) p.work -= dt;
  if (p.path.length) {
    const [tx, ty] = p.path[0], sp = 5 * dt;
    const dx = tx - p.px, dy = ty - p.py, d = Math.hypot(dx, dy);
    if (d > 0.01) p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    if (d <= sp) {
      p.px = tx; p.py = ty; p.x = tx; p.y = ty; p.path.shift();
      if (!p.path.length && p.job) { const e = byId(p.job); if (e) interact(e, true); }
    } else { p.px += dx / d * sp; p.py += dy / d * sp; }
  }
  if (ui.hold) { ui.holdT -= dt; if (ui.holdT <= 0) { ui.holdT = 0.25; const e = byId(ui.hold); if (e) interact(e, false); } }
}

// ---------------------------------------------------------------- construction
function costOf(key) { for (const s in BUILD) for (const b of BUILD[s]) if (b[0] === key) return b[1]; return 0; }
function nameOf(key) { if (MACH[key]) return MACH[key].name; for (const s in BUILD) for (const b of BUILD[s]) if (b[0] === key) return b[2]; return key; }
function unlockOf(key) { for (const s in BUILD) for (const b of BUILD[s]) if (b[0] === key) return +s; return 9; }
function stageOf(key) { if (MACH[key]) return MACH[key].stage; return key === "crank" ? 3 : 1; }
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
    if (ex) { ex.d = BROT[rot]; return true; }
    if (S.coins < cost) { toast("Pas assez de pièces"); return false; }
    S.belts[k] = { x, y, d:BROT[rot], lanes:[[], []], on:false }; S.coins -= cost; return true;
  }
  if (S.coins < cost) { toast("Pas assez de pièces"); return false; }
  if (!canPlace(key, o, x, y)) { toast("Place occupée"); return false; }
  const kind = MACH[key] ? "machine" : key === "crank" ? "crank" : "chest";
  addEnt({ kind, name:key, stage:stageOf(key), x, y, o, store:kind === "chest" ? {} : undefined });
  S.coins -= cost; return true;
}
function demolish(x, y) {
  const b = S.belts[x + "," + y];
  if (b) { delete S.belts[x + "," + y]; S.coins += costOf("belt"); return; }
  const e = entAt(x, y);
  if (!e || ["source", "crate", "deco", "rug"].includes(e.kind)) return;
  if (e.kind === "chest" && S.ents.filter((c) => c.kind === "chest").length === 1) { toast("Garde au moins un coffre."); return; }
  S.ents = S.ents.filter((z) => z !== e); invalidate();
  S.coins += Math.round(costOf(e.name) / 2);
  if (ui.sel === e.id) ui.sel = null;
  toast(`${nameOf(e.name)} démonté : la moitié du prix est rendue.`);
}
function rotateEnt(e) {
  const o = ROT[(ROT.indexOf(e.o) + 1) % 4];
  if (canPlace(e.name, o, e.x, e.y, e)) { e.o = o; invalidate(); } else toast("Pas la place pour tourner");
}

// ---------------------------------------------------------------- boucle
let last = performance.now(), powerT = 0, uiT = 0;
function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  for (let i = 0; i < (S.test ? 5 : 1); i++) step(dt);
  draw(now / 1000);
  uiT -= dt; if (uiT <= 0 || ui.dirty) { uiT = 0.25; renderUI(); ui.dirty = false; }
  requestAnimationFrame(tick);
}
function step(dt) {
  S.time += dt;
  powerT -= dt; if (powerT <= 0) { computePower(); powerT = 0.25; }
  for (const c of S.ents) {
    if (c.kind === "crank" && c.load > 0) c.reserve = Math.max(0, c.reserve - dt);
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
let zoom = 1, cam = { x:0, y:0 }, cssW = 0, cssH = 0, dpr = 1;
const ZOOMS = [1, 2, 3, 4];
function resize() {
  const r = cv.parentElement.getBoundingClientRect();
  dpr = Math.max(1, Math.round(window.devicePixelRatio || 1)); cssW = r.width; cssH = r.height;
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  cv.style.width = cssW + "px"; cv.style.height = cssH + "px";
}
function fitZoom() { let z = 1; for (const c of ZOOMS) if (W * T * c <= cssW * 1.05) z = c; zoom = z; }
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
  const frames = s.frames || 1, f = working ? Math.floor(time * (e.boost > 0 ? 16 : 8)) % frames : 0;
  const ox = (s.origin || [0, 0])[0], oy = (s.origin || [0, 0])[1];
  const fw = s.frame[0], fh = s.frame[1], X = e.x * T - ox, Y = e.y * T - oy;
  if (i) ctx.drawImage(i, f * fw, 0, fw, fh, X, Y, fw, fh);
  if (ui.sel === e.id) { ctx.strokeStyle = "#ffd65a"; ctx.lineWidth = 1; const f2 = fp(e); ctx.strokeRect(e.x * T + 0.5, e.y * T + 0.5, f2.w * T - 1, f2.h * T - 1); }
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
  cam.x = W * T <= vw ? (W * T - vw) / 2 : Math.max(0, Math.min(W * T - vw, p.px * T + 16 - vw / 2));
  cam.y = H * T <= vh ? (H * T - vh) / 2 : Math.max(0, Math.min(H * T - vh + 60, p.py * T + 16 - vh / 2));
  ctx.setTransform(s, 0, 0, s, Math.round(-cam.x * s), Math.round(-cam.y * s));
  ctx.imageSmoothingEnabled = false;
  const st = S.stage, wall = stageImg(st, TILESET[st][1] + ".png"), floor = stageImg(st, TILESET[st][0] + ".png");
  for (let x = 0; x < W; x++) {
    if (wall) ctx.drawImage(wall, (hash(x, 0) % 7 === 0 ? 1 : hash(x, 1) % 9 === 0 ? 2 : 0) * 32, 0, 32, 64, x * T, 0, 32, 64);
    for (let y = Y0; y < H; y++) if (floor) { const h = hash(x, y) % 10, n = floor.width / 32; const v = n === 2 ? (h < 8 ? 0 : 1) : st === 5 ? 0 : (h < 7 ? 0 : h < 9 ? 1 : 2); ctx.drawImage(floor, v * 32, 0, 32, 32, x * T, y * T, 32, 32); }
  }
  // portée du personnage
  if (ui.mode === "hand") { ctx.fillStyle = "rgba(255,240,160,.05)"; ctx.fillRect((p.x - RANGE) * T, (p.y - RANGE) * T, (2 * RANGE + 1) * T, (2 * RANGE + 1) * T); }
  for (const e of S.ents) if (e.kind === "rug") drawEnt(e, time);
  const belt = img("usine/tapis/bois.png"), bl = Object.values(S.belts);
  for (const b of bl) { const bi = img(`usine/tapis/${b.k || "bois"}.png`); if (bi) ctx.drawImage(bi, (b.on ? Math.floor(time * 6 * BELT_SPEED[b.k || "bois"] / 0.5) % 4 : 0) * 32, BELT_ROWS.indexOf(beltRow(b)) * 32, 32, 32, b.x * T, b.y * T, 32, 32); }
  for (const b of bl) for (let l = 0; l < 2; l++) for (const o of b.lanes[l]) { const [x, y] = beltPos(b, l, o.p); drawItem(o.it, x - 8, y - 11); }
  for (const b of bl) {
    if (!b.on) drawIcon("eclair", b.x * T + 8, b.y * T + 6);
    else if (b.bt && (b.bt[0] > 4 || b.bt[1] > 4) && Math.floor(time * 2) % 2) drawIcon("non", b.x * T + 8, b.y * T + 6);   // voie bloquée depuis plus de 4 s
  }
  const list = [];
  for (const e of S.ents) if (e.kind !== "rug") list.push([(e.y + fp(e).h) * T - 1, () => drawEnt(e, time)]);
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
    const [hx, hy] = ui.hover, key = ui.build, ok = canPlace(key, ROT[ui.rot], hx, hy) && S.coins >= costOf(key);
    ctx.globalAlpha = 0.6;
    if (key === "belt") { if (belt) ctx.drawImage(belt, 0, BELT_ROWS.indexOf(BROT[ui.rot]) * 32, 32, 32, hx * T, hy * T, 32, 32); }
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
const release = () => { ui.drag = null; ui.hold = null; };
cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);
cv.addEventListener("contextmenu", (ev) => ev.preventDefault());
cv.addEventListener("pointerdown", (ev) => {
  const [x, y] = tileAt(ev); ui.hover = [x, y];
  try { cv.setPointerCapture(ev.pointerId); } catch {}
  if (ui.mode === "build" && ui.build) {
    if (place(ui.build, ui.rot, x, y) && ui.build === "belt") ui.drag = [x, y];
    ui.dirty = true; return;
  }
  if (ui.mode === "demolish") { demolish(x, y); ui.dirty = true; return; }
  const e = entAt(x, y), p = S.player;
  if (ui.mode === "inspect") { if (e) select(e); return; }
  if (e && e.kind !== "deco") { ui.hold = e.id; ui.holdT = 0.35; ui.harvest = 0; ui.target = null; interact(e, true); if (e.kind === "source") select(e, true); }
  else { const path = bfs(p.x, p.y, (a, b) => a === x && b === y); if (path) { p.path = path; p.job = null; ui.target = [x, y]; } }
  ui.dirty = true;
});
window.addEventListener("keydown", (ev) => {
  if (ev.target.tagName === "SELECT" || ev.target.tagName === "INPUT") return;
  if (ev.key === "r" || ev.key === "R") { ui.rot = (ui.rot + 1) % 4; ui.dirty = true; }
  if (ev.key === "Escape") setMode("hand");
  const k = { "1":"hand", "2":"build", "3":"inspect", "4":"demolish" }[ev.key]; if (k) setMode(k);
});

// ---------------------------------------------------------------- interface (pixel art)
const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString("fr-FR");
const fmtN = (n) => (Math.round(n * 10) / 10).toLocaleString("fr-FR");
const itemHTML = (it, n) => `<span class="it" style="--i:${ITEMS.indexOf(iconOf(it))}" title="${label(it)}"></span>${n != null ? `<b class="n">${n}</b>` : ""}`;
const icon = (name) => `<span class="ic" style="--i:${ICONS.indexOf(name)}"></span>`;
function select(e, quiet) { ui.sel = e.id; if (!quiet || ui.tab === "selection") ui.tab = "selection"; ui.dirty = true; }
function setMode(m) { ui.mode = m; if (m !== "build") ui.build = null; if (m === "build") ui.tab = "construire"; ui.dirty = true; }
let toastT = 0;
function toast(msg, ms = 3500) { const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms); }
const fmtTime = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}`; };
function gauge(frac, color = "vert") { return `<div class="gauge"><i class="g-${color}" style="width:${Math.round(100 * Math.max(0, Math.min(1, frac)))}%"></i></div>`; }
function renderUI() {
  $("coins").textContent = fmt(S.coins); $("stars").textContent = fmt(S.stars);
  $("stage").textContent = `Étape ${S.stage} · ${STAGE_NAMES[S.stage]}`;
  for (const b of document.querySelectorAll("[data-mode]")) b.classList.toggle("on", b.dataset.mode === ui.mode);
  for (const b of document.querySelectorAll("[data-tab]")) b.classList.toggle("on", b.dataset.tab === ui.tab);
  $("rot").dataset.r = ui.rot; $("test").classList.toggle("on", S.test);
  // sac
  let bag = "";
  for (let i = 0; i < BAG; i++) { const s = S.bag[i]; bag += `<div class="slot">${s ? itemHTML(s.it, s.n) : ""}</div>`; }
  if ($("bag").dataset.h !== bag) { $("bag").innerHTML = bag; $("bag").dataset.h = bag; }
  let h = "";
  if (ui.tab === "commandes") {
    h += `<h3>${icon("commandes")} Commandes du jour</h3><p class="muted">À livrer à la caisse d'expédition. Étoiles ×1,5 si c'est fait en moins de 7 min.</p>`;
    for (const c of S.contracts) {
      const left = c.dl - (S.time - c.t0), fast = S.time - c.t0 < c.bonus_s;
      h += `<div class="card"><div class="row">${itemHTML(c.key)}<span>${label(c.key)}</span><span class="grow"></span><b>${c.got} / ${c.n}</b></div>${gauge(c.got / c.n)}
        <div class="row muted">${icon("etoile")}<span>${c.stars}${fast ? " ×1,5" : ""}</span>${icon("piece")}<span>${c.pay}</span><span class="grow"></span>${icon("horloge")}<span>${fmtTime(left)}</span></div></div>`;
    }
    h += `<h3>Ventes</h3><div class="wrap">${Object.entries(S.stats).filter(([it]) => price(it) > 0).map(([it, n]) => `<span class="chip">${itemHTML(it, fmt(n))}</span>`).join("") || '<span class="muted">Rien vendu pour l’instant.</span>'}</div>`;
  }
  if (ui.tab === "marche") {
    h += `<h3>${icon("marche")} Marché</h3><p class="muted">Les tas se rechargent seuls, gratuitement. Pour aller plus vite, achète : la matière arrive dans le tas (200 au plus).</p>`;
    for (const s of S.ents.filter((e) => e.kind === "source")) {
      const r = RAW[s.gives];
      h += `<div class="card"><div class="row">${itemHTML(s.gives)}<span>${label(s.gives)}</span><span class="grow"></span><span class="muted">${Math.floor(s.stock)} / ${r.cap} · +${fmtN(r.refill)}/s</span></div>
        <div class="row"><span class="muted">${fmtN(r.cost)} p l'unité</span><span class="grow"></span>${[1, 10, 50].map((n) => `<button class="btn sm" data-buy="${s.gives}" data-n="${n}" ${S.coins < n * r.cost ? "disabled" : ""}>×${n}</button>`).join("")}</div></div>`;
    }
  }
  if (ui.tab === "progression") {
    const g = gateStatus();
    h += `<h3>${icon("progression")} Étape ${S.stage} · ${STAGE_NAMES[S.stage]}</h3>`;
    if (g) {
      h += `<p>Pour passer à l'étape ${S.stage + 1} (${STAGE_NAMES[S.stage + 1]}) :</p>`;
      for (const p of g.parts) h += `<div class="card"><div class="row">${icon(p.ok ? "ok" : "cadenas")}<span>${p.text}</span></div>${gauge(p.frac, p.ok ? "vert" : "or")}</div>`;
      h += `<p class="muted">Débloque : ${UNLOCK_TEXT[S.stage + 1]}</p><button class="btn vert wide" id="advance" ${g.ok ? "" : "disabled"}>Passer à l'étape ${S.stage + 1}</button>`;
    } else if (!S.demo) h += `<p>Fin du prototype : les étapes 4 à 8 (vapeur, électricité, robots) viendront ensuite.</p>`;
    h += S.demo ? `<div class="card"><p>${icon("info")} Démo : une usine électrique (étape 5) déjà montée. Inspecte les machines, change le débit des extracteurs pour voir les voies se boucher.</p><button class="btn or wide" id="quitdemo">Revenir à ma partie</button></div>`
      : `<button class="btn or wide" id="demo">${icon("eclair")} Voir une usine automatisée (étape 5)</button>`;
    h += `<h3>${icon("info")} Comment jouer</h3><p class="muted">Touche un tas et garde le doigt appuyé pour remplir ton sac. Touche une machine pour y déposer ce qu'elle accepte et reprendre ce qui en sort ; garde le doigt dessus pour l'accélérer. Vends à la caisse. Tu agis jusqu'à ${RANGE} cases autour de toi.</p>`;
  }
  if (ui.tab === "construire") {
    h += `<h3>${icon("marteau")} Construire</h3><p class="muted">Choisis, puis touche le sol. ${icon("tourner")} pour tourner (touche R). Les tapis se tracent en glissant.</p><div class="grid">`;
    for (let s = 1; s <= 3; s++) for (const [key] of BUILD[s]) {
      const lock = s > S.stage, cost = costOf(key);
      let pic;
      if (key === "belt") pic = `<span class="pic" style="background-image:url(usine/tapis/bois.png);width:32px;height:32px"></span>`;
      else { const sp = sprOf(key, stageOf(key), "e"); pic = `<span class="pic" style="background-image:url(usine/etape-${stageOf(key)}/${sp.file});width:${sp.frame[0]}px;height:${sp.frame[1]}px;transform:scale(${Math.min(1, 56 / sp.frame[1])})"></span>`; }
      h += `<button class="btn tile ${ui.build === key ? "on" : ""}" data-build="${key}" ${lock ? "disabled" : ""}><span class="picbox">${pic}</span><span>${nameOf(key)}</span><small>${lock ? "étape " + s : icon("piece") + fmt(cost)}</small></button>`;
    }
    h += `</div>`;
  }
  if (ui.tab === "selection") {
    const e = byId(ui.sel);
    if (!e) h += `<p class="muted">Touche une machine, un tas ou un coffre pour voir ce qu'il contient.</p>`;
    else if (e.kind === "machine") {
      const info = MACH[e.name], recs = RECIPES[e.name];
      h += `<h3>${info.name}</h3><p class="muted">Étape ${info.stage} · vitesse ×${String(SPEED[info.stage]).replace(".", ",")}${info.power ? " · demande une manivelle à 4 cases au plus" : ""}</p>`;
      if (e.stalled) h += `<p class="bad">${icon("eclair")} Sans énergie</p>`;
      if (recs.length > 1) {
        h += `<label>Recette <select id="recipe"><option value="auto">Automatique</option>${recs.map((r) => `<option value="${r.id}" ${e.recipe === r.id ? "selected" : ""}>${r.name}</option>`).join("")}</select></label>`;
        if (recs.some((r) => r.color)) h += `<label>Couleur préférée <select id="color"><option value="">—</option>${COLORS.map((c) => `<option value="${c}" ${e.color === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>`;
      }
      h += `<div class="card">${activeRecipes(e).slice(0, 6).map((r) => `<div class="rec ${e.craft && e.craft.id === r.id ? "on" : ""}">${Object.entries(r.in).map(([k, n]) => itemHTML(k, n)).join("")}<span class="arrow">→</span>${Object.entries(r.out).map(([k, n]) => itemHTML(k, n < 1 ? "~" : n)).join("")}<small>${(r.t / SPEED[info.stage]).toFixed(1).replace(".", ",")} s</small></div>`).join("")}</div>`;
      h += `<div class="row"><span class="muted">Dedans</span>${Object.entries(e.inb).map(([k, n]) => itemHTML(k, n)).join("") || '<span class="muted">vide</span>'}</div>`;
      h += `<div class="row"><span class="muted">Sorti</span>${Object.entries(e.outb).map(([k, n]) => itemHTML(k, n)).join("") || '<span class="muted">rien</span>'}</div>`;
      if (e.craft) h += gauge(e.craft.t / e.craft.dur, e.boost > 0 ? "or" : "vert");
      h += `<div class="row"><button class="btn" id="rotate">${icon("tourner")} Tourner</button><button class="btn rouge" id="demol">${icon("poubelle")} Démonter</button></div>`;
    } else if (e.kind === "source") {
      const r = RAW[e.gives];
      h += `<h3>${itemHTML(e.gives)} Tas de ${label(e.gives).toLowerCase()}</h3><p>${Math.floor(e.stock)} unités · se recharge de ${fmtN(r.refill)}/s jusqu'à ${r.cap}.</p>${gauge(Math.min(1, e.stock / r.cap), "bleu")}`;
      h += `<div class="row"><span class="muted">Acheter (${fmtN(r.cost)} p l'unité)</span><span class="grow"></span>${[1, 10, 50].map((n) => `<button class="btn sm" data-buy="${e.gives}" data-n="${n}">×${n}</button>`).join("")}</div>`;
      if (S.stage >= 3) h += e.chute ? `<p class="muted">${icon("tapis")} Goulotte posée : le tas verse sur le tapis qui part de lui (jusqu'à ${CHUTE_RATE}/s).</p>`
        : `<button class="btn or wide" id="chute">${icon("tapis")} Poser une goulotte (${CHUTE_COST} p)</button>`;
    } else if (e.kind === "crank") {
      h += `<h3>Manivelle</h3><p>Réserve : ${Math.floor(e.reserve)} / ${CRANK_MAX} s. Alimente 4 machines à tapis et 8 cases de tapis à ${CRANK_R} cases au plus. Touche-la pour la remonter.</p>${gauge(e.reserve / CRANK_MAX, "bleu")}<div class="row"><button class="btn rouge" id="demol">${icon("poubelle")} Démonter</button></div>`;
    } else if (e.kind === "chest") {
      h += `<h3>Coffre</h3><div class="wrap">${Object.entries(e.store).map(([k, n]) => `<span class="chip">${itemHTML(k, n)}</span>`).join("") || '<span class="muted">vide</span>'}</div><p class="muted">Touche-le avec quelque chose dans le sac pour tout y ranger ; avec le sac vide pour tout reprendre. Un tapis qui finit dans un coffre y range ses objets (trop-plein).</p>`;
    } else if (e.kind === "extractor") {
      h += `<h3>${itemHTML(e.gives)} Extracteur de ${label(e.gives).toLowerCase()}</h3><p>Pose ${fmtN(e.rate)} objet/s sur le tapis voisin, sur la voie de son côté. Demande un poteau électrique à ${POLE_R} cases.</p>`;
      h += `<div class="row"><span class="muted">Débit</span><span class="grow"></span>${[0.1, 0.25, 0.5, 1, 2].map((r) => `<button class="btn sm ${e.rate === r ? "on" : ""}" data-rate="${r}">${fmtN(r)}/s</button>`).join("")}</div>`;
    } else if (e.kind === "generator") {
      h += `<h3>Générateur</h3><p class="muted">900 kW. Tout ce qui a un poteau à ${POLE_R} cases ou moins est alimenté.</p>`;
    } else if (e.kind === "pole") {
      h += `<h3>Poteau électrique</h3><p class="muted">Alimente les machines et extracteurs à ${POLE_R} cases ou moins.</p>`;
    } else h += `<h3>Caisse d'expédition</h3><p class="muted">Touche-la pour vendre tout ce que ton sac contient de produits finis.</p>`;
  }
  if (ui.tab === "progression") h += `<h3>${icon("maison")} Ton personnage</h3><div id="avslot" class="row"></div><button class="btn rouge wide" id="reset2">Recommencer la partie</button>`;
  const box = $("panel");
  if (box.dataset.h !== h) {
    const av = $("avatar"); document.body.appendChild(av); av.hidden = true;
    box.innerHTML = h; box.dataset.h = h; bindPanel();
    const slot = $("avslot"); if (slot) { slot.appendChild(av); av.hidden = false; }
  }
}
function bindPanel() {
  const e = byId(ui.sel);
  $("advance")?.addEventListener("click", advance);
  for (const b of document.querySelectorAll("[data-build]")) b.addEventListener("click", () => { ui.build = b.dataset.build; ui.mode = "build"; ui.dirty = true; });
  for (const b of document.querySelectorAll("[data-buy]")) b.addEventListener("click", () => buy(b.dataset.buy, +b.dataset.n));
  $("recipe")?.addEventListener("change", (ev) => { e.recipe = ev.target.value; ui.dirty = true; });
  $("color")?.addEventListener("change", (ev) => { e.color = ev.target.value || null; ui.dirty = true; });
  $("rotate")?.addEventListener("click", () => { rotateEnt(e); ui.dirty = true; });
  $("demol")?.addEventListener("click", () => { demolish(e.x, e.y); ui.dirty = true; });
  for (const b of document.querySelectorAll("[data-rate]")) b.addEventListener("click", () => { e.rate = +b.dataset.rate; ui.dirty = true; });
  $("demo")?.addEventListener("click", () => openDemo());
  $("quitdemo")?.addEventListener("click", () => closeDemo());
  $("reset2")?.addEventListener("click", () => $("confirm").classList.add("on"));
  $("chute")?.addEventListener("click", () => { if (S.coins < CHUTE_COST) return toast("Pas assez de pièces"); S.coins -= CHUTE_COST; e.chute = true; ui.dirty = true; });
}
for (const b of document.querySelectorAll("[data-mode]")) b.addEventListener("click", () => setMode(b.dataset.mode));
for (const b of document.querySelectorAll("[data-tab]")) b.addEventListener("click", () => { ui.tab = b.dataset.tab; ui.dirty = true; });
$("rot").addEventListener("click", () => { ui.rot = (ui.rot + 1) % 4; ui.dirty = true; });
$("zin").addEventListener("click", () => { zoom = ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)]; });
$("zout").addEventListener("click", () => { zoom = ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)]; });
$("test").addEventListener("click", () => { S.test = !S.test; toast(S.test ? "Mode test : temps ×5. « +1 000 » pour avancer vite." : "Mode test coupé"); ui.dirty = true; });
$("gift").addEventListener("click", () => { S.coins += 1000; S.earned += 1000; ui.dirty = true; });
$("reset").addEventListener("click", () => $("confirm").classList.add("on"));
$("cno").addEventListener("click", () => $("confirm").classList.remove("on"));
$("cyes").addEventListener("click", () => { $("confirm").classList.remove("on"); try { localStorage.removeItem(SAVE_KEY); } catch {} const av = S.avatar; newState(); S.avatar = av; ui.sel = null; ui.dirty = true; });
const spSel = $("species"), colSel = $("acolor");
spSel.innerHTML = SPECIES.map((s) => `<option value="${s}">${SPECIES_FR[s]}</option>`).join("");
colSel.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7].map((c) => `<option value="${c}">Couleur ${c + 1}</option>`).join("");
function syncAvatar() { spSel.value = S.avatar.species; colSel.value = S.avatar.color; colSel.disabled = !COLORABLE.includes(S.avatar.species); $("santa").checked = S.avatar.santa; }
spSel.addEventListener("change", () => { S.avatar.species = spSel.value; syncAvatar(); });
colSel.addEventListener("change", () => { S.avatar.color = +colSel.value; });
$("santa").addEventListener("change", (ev) => { S.avatar.santa = ev.target.checked; });

// ---------------------------------------------------------------- sauvegarde
function save() { if (S.demo) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} }
// ---------------------------------------------------------------- démo : une usine électrique montée (étape 5)
function demoState() {
  newState(); S.demo = true; S.stage = 5; S.coins = 250000; S.earned = 250000;
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
  addEnt({ kind:"generator", name:"generator", stage:5, x:21, y:14, o:"e" });
  for (const [x, y] of [[4, 7], [9, 7], [13, 11], [17, 9], [19, 13], [4, 11]]) addEnt({ kind:"pole", name:"pole", stage:5, x, y });
  S.player = { x:12, y:11, px:12, py:11, path:[], dir:"up", work:0, job:null };
  S.contracts = []; for (let i = 0; i < 3; i++) newContract();
  for (let i = 0; i < 1800; i++) step(0.05);       // 90 s de mise en route : les tapis sont pleins à l'ouverture
}
let saved = null;
function openDemo() { save(); saved = S; demoState(); ui.sel = null; ui.tab = "progression"; ui.dirty = true; try { location.hash = "demo-etape-5"; } catch {} toast("Démo : usine électrique (étape 5). Touche une machine ou un extracteur pour voir ce qui s'y passe.", 6000); }
function closeDemo() { S = saved || S; if (!saved) load(); saved = null; if (S.demo) newState(); invalidate(); ui.sel = null; ui.dirty = true; try { history.replaceState(null, "", location.pathname); } catch {} }
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const s = JSON.parse(raw); if (s.v === 2) { S = s; invalidate(); return; } } } catch {}
  newState();
}
load(); syncAvatar();
if (location.hash === "#demo-etape-5") { saved = S; demoState(); ui.tab = "progression"; }
setInterval(save, 4000); window.addEventListener("beforeunload", save);
new ResizeObserver(() => resize()).observe(cv.parentElement);
resize(); fitZoom();
if (S.time < 1) toast("Garde le doigt sur le tas de sable pour remplir ton sac, puis touche le four.", 7000);
document.fonts?.load('8px "Chaumiere Pixel"');
requestAnimationFrame(tick);
window.__usine = { get S() { return S; }, step, place, advance, sell, interact, buy, byId, entAt, computePower, bagAdd };
})();
