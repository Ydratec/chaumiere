// Règles de la ferme : fonctions pures (testées dans tests/unit/farm.test.ts).
import { BUILDINGS, GRID_H, GRID_W, isBuilding, isItem, type BuildingId, type Inventory, type ItemId, type Recipe } from "./catalog.ts";

/** Un objet posé : (x, y) = son coin haut-gauche. */
export type Tile = { x: number; y: number; kind: string; item: string | null; started_at: string | null; ready_at: string | null };
export type Cell = { x: number; y: number };

export const recipeOf = (kind: string, id: string | null): Recipe | undefined =>
  isBuilding(kind) && id ? BUILDINGS[kind].recipes.find((r) => r.id === id) : undefined;

export const sizeOf = (kind: string): [number, number] => (isBuilding(kind) ? BUILDINGS[kind].size : [1, 1]);

/** Hauteur de la grille selon les déblocages de la salle. */
export const gridH = (unlocks: string[] = []) => (unlocks.includes("upgrade:land") ? GRID_H + 4 : GRID_H);
/** Nombre max d'un objet (le 2e poulailler se débloque). */
export const maxOf = (kind: BuildingId, unlocks: string[] = []) =>
  kind === "coop" && unlocks.includes("upgrade:coop2") ? 2 : BUILDINGS[kind].max;

/** Durée en ms ; les améliorations de salle l'accélèrent. */
export const duration = (r: Recipe, upgrades: string[] = []) => r.minutes * 60_000 * (upgrades.includes("upgrade:speed") ? 0.75 : 1);

export const has = (inv: Inventory, need: Inventory) =>
  Object.entries(need).every(([k, v]) => (inv[k as ItemId] ?? 0) >= (v ?? 0));
export const negate = (need: Inventory): Inventory =>
  Object.fromEntries(Object.entries(need).map(([k, v]) => [k, -(v ?? 0)]));

export const isReady = (t: Tile, now: number) => !!t.item && !!t.ready_at && Date.parse(t.ready_at) <= now;
export function progress(t: Tile, now: number) {
  if (!t.item || !t.started_at || !t.ready_at) return 0;
  const a = Date.parse(t.started_at), b = Date.parse(t.ready_at);
  return Math.min(1, Math.max(0, (now - a) / Math.max(1, b - a)));
}

// ---------- Grille : emprise des objets, placement, chemins du chat ----------

const key = (x: number, y: number) => `${x},${y}`;

/** Cases couvertes par un objet posé en (x, y). */
export function footprint(kind: string, x: number, y: number): Cell[] {
  const [w, h] = sizeOf(kind);
  return Array.from({ length: w * h }, (_, i) => ({ x: x + (i % w), y: y + Math.floor(i / w) }));
}

/** Case → objet qui l'occupe. */
export function occupancy(tiles: Tile[]) {
  const m = new Map<string, Tile>();
  for (const t of tiles) for (const c of footprint(t.kind, t.x, t.y)) m.set(key(c.x, c.y), t);
  return m;
}
export const tileAt = (tiles: Tile[], x: number, y: number) => occupancy(tiles).get(key(x, y));

/**
 * Pourquoi on ne peut pas poser cet objet ici (null = possible).
 * `moving` : l'objet qu'on déplace (ignoré pour les collisions, et rien à payer).
 */
export function placeError(tiles: Tile[], inv: Inventory, kind: BuildingId, x: number, y: number, unlocks: string[] = [], moving?: Tile) {
  const [w, h] = BUILDINGS[kind].size;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x + w > GRID_W || y + h > gridH(unlocks)) return "Ça dépasse de la ferme.";
  const occ = occupancy(tiles.filter((t) => t !== moving && !(moving && t.x === moving.x && t.y === moving.y)));
  if (footprint(kind, x, y).some((c) => occ.has(key(c.x, c.y)))) return "Il y a déjà quelque chose ici.";
  if (moving) return null;
  const b = BUILDINGS[kind];
  if (b.requires && !unlocks.includes(b.requires)) return "À débloquer avec un projet de la salle.";
  const max = maxOf(kind, unlocks);
  if (max && tiles.filter((t) => t.kind === kind).length >= max) return max > 1 ? `Tu en as déjà ${max}.` : `Tu as déjà un ${b.name.toLowerCase()}.`;
  if ((inv.coins ?? 0) < b.cost) return "Pas assez de pièces.";
  return null;
}

/** Pourquoi on ne peut pas lancer cette recette sur cet objet (null = possible). */
export function startError(tile: Tile | undefined, inv: Inventory, recipe: string) {
  if (!tile) return "Rien à cet endroit.";
  if (tile.item) return "Déjà occupé.";
  const r = recipeOf(tile.kind, recipe);
  if (!r) return "Impossible ici.";
  if (!has(inv, r.inputs)) return "Il te manque des ingrédients.";
  return null;
}

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Plus court chemin du chat (pas à pas, sans traverser les objets) de `from` jusqu'à une case de `goals`.
 * Renvoie les cases à parcourir (sans la case de départ), [] si déjà arrivé, null si inaccessible.
 */
export function findPath(tiles: Tile[], h: number, from: Cell, goals: Cell[]): Cell[] | null {
  const occ = occupancy(tiles);
  const goal = new Set(goals.map((c) => key(c.x, c.y)));
  if (goal.has(key(from.x, from.y))) return [];
  const prev = new Map<string, string | null>([[key(from.x, from.y), null]]);
  const queue: Cell[] = [from];
  while (queue.length) {
    const c = queue.shift()!;
    for (const [dx, dy] of STEPS) {
      const n = { x: c.x + dx, y: c.y + dy }, k = key(n.x, n.y);
      if (n.x < 0 || n.y < 0 || n.x >= GRID_W || n.y >= h || prev.has(k) || occ.has(k)) continue;
      prev.set(k, key(c.x, c.y));
      if (goal.has(k)) {
        const path: Cell[] = [];
        for (let p: string | null = k; p && p !== key(from.x, from.y); p = prev.get(p) ?? null) {
          const [x, y] = p.split(",").map(Number);
          path.unshift({ x, y });
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

/** Cases libres juste à côté d'un objet (d'où le chat peut l'utiliser). */
export function around(tile: Tile, h: number): Cell[] {
  const [w, hh] = sizeOf(tile.kind);
  const cells: Cell[] = [];
  for (let x = tile.x - 1; x <= tile.x + w; x++)
    for (let y = tile.y - 1; y <= tile.y + hh; y++) {
      const inside = x >= tile.x && x < tile.x + w && y >= tile.y && y < tile.y + hh;
      const corner = (x < tile.x || x >= tile.x + w) && (y < tile.y || y >= tile.y + hh);
      if (!inside && !corner && x >= 0 && y >= 0 && x < GRID_W && y < h) cells.push({ x, y });
    }
  return cells;
}

/** Tri pour l'affichage : objets possédés, hors pièces. */
export const owned = (inv: Inventory) =>
  (Object.entries(inv) as [ItemId, number][]).filter(([k, v]) => k !== "coins" && v > 0);

/** Une offre d'échange : un objet contre un autre, 1 à 999 unités chacun. Renvoie l'erreur, ou null. */
export function offerError(give: Inventory, want: Inventory) {
  const g = Object.entries(give), w = Object.entries(want);
  if (g.length !== 1 || w.length !== 1) return "Choisis un objet à donner et un à recevoir.";
  const [[gi, gq], [wi, wq]] = [g[0], w[0]];
  if (!isItem(gi) || !isItem(wi)) return "Objet inconnu.";
  if (gi === wi) return "Choisis deux objets différents.";
  if (![gq, wq].every((q) => Number.isInteger(q) && q! >= 1 && q! <= 999)) return "Quantités entre 1 et 999.";
  return null;
}
