// Fleurs : une seule graine (le pot), qui donne au hasard une fleur parmi celles-ci ; les plus rares sont les plus belles.
import type { Inventory, ItemId } from "./catalog.ts";

/** `weight` : chances relatives (total 100, donc la fleur de lune sort 1 fois sur 100). */
export const FLOWERS = [
  { id: "flower", weight: 40 }, // Cosmos
  { id: "poppy", weight: 22 },
  { id: "tulip", weight: 15 },
  { id: "sunflower", weight: 10 },
  { id: "lavender", weight: 6 },
  { id: "rose", weight: 4 },
  { id: "orchid", weight: 2 },
  { id: "moonflower", weight: 1 }, // la plus rare, la plus belle
] as const satisfies readonly { id: ItemId; weight: number }[];
export type FlowerId = (typeof FLOWERS)[number]["id"];

export const isFlower = (id: string): id is FlowerId => FLOWERS.some((f) => f.id === id);

export const RARITIES = ["commune", "peu commune", "rare", "très rare", "légendaire"] as const;
/** Rareté d'une fleur d'après ses chances. */
export const rarityOf = (id: FlowerId): (typeof RARITIES)[number] => {
  const w = FLOWERS.find((f) => f.id === id)!.weight;
  return w >= 20 ? "commune" : w >= 10 ? "peu commune" : w >= 4 ? "rare" : w >= 2 ? "très rare" : "légendaire";
};

/** Tirage pondéré de la fleur qui pousse. `rand` : nombre dans [0, 1). */
export function pickFlower(rand = Math.random): FlowerId {
  const total = FLOWERS.reduce((n, f) => n + f.weight, 0);
  let r = rand() * total;
  for (const f of FLOWERS) if ((r -= f.weight) < 0) return f.id;
  return FLOWERS[0].id;
}

export const BOUQUET_MAX = 7;
export const MESSAGE_MAX = 140;

/** Un cadeau : 1 fleur, ou un bouquet de 2 à BOUQUET_MAX fleurs (de variétés au choix). Renvoie l'erreur, ou null. */
export function giftError(items: Inventory) {
  const e = Object.entries(items);
  if (!e.length || e.some(([k, v]) => !isFlower(k) || !Number.isInteger(v) || (v ?? 0) < 1)) return "Choisis des fleurs à offrir.";
  if (e.reduce((n, [, v]) => n + (v ?? 0), 0) > BOUQUET_MAX) return `Un bouquet compte au plus ${BOUQUET_MAX} fleurs.`;
  return null;
}
