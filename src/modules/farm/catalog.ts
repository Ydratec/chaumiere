// Contenu de la ferme : objets posables (avec leur taille), recettes et objets de la grange. Tout est réglable ici.

export const GRID_W = 12;
export const GRID_H = 12; // 16 rangées une fois « upgrade:land » débloqué par la salle
export const START_COINS = 50;
export const START_OBJECTS: { kind: "planter"; x: number; y: number }[] = [
  { kind: "planter", x: 2, y: 4 },
  { kind: "planter", x: 5, y: 4 },
  { kind: "planter", x: 8, y: 4 },
];
export const START_CAT = { x: 6, y: 8 };

export type ItemId =
  | "coins" | "wheat" | "carrot" | "corn" | "strawberry" | "egg" | "bread" | "cake"
  | "flower" | "poppy" | "tulip" | "sunflower" | "lavender" | "rose" | "orchid" | "moonflower"; // les fleurs : voir flowers.ts

/** `price` : prix de vente au village (réduit depuis la refonte : les commandes et les chantiers paient mieux que la vente en vrac). */
export const ITEMS: Record<ItemId, { name: string; price: number }> = {
  coins: { name: "Pièces", price: 0 },
  wheat: { name: "Blé", price: 1 },
  carrot: { name: "Carotte", price: 3 },
  corn: { name: "Maïs", price: 5 },
  strawberry: { name: "Fraise", price: 12 },
  flower: { name: "Cosmos", price: 2 },
  poppy: { name: "Coquelicot", price: 3 },
  tulip: { name: "Tulipe", price: 4 },
  sunflower: { name: "Tournesol", price: 6 },
  lavender: { name: "Lavande", price: 10 },
  rose: { name: "Rose", price: 16 },
  orchid: { name: "Orchidée", price: 40 },
  moonflower: { name: "Fleur de lune", price: 150 },
  egg: { name: "Œuf", price: 5 },
  bread: { name: "Pain", price: 7 },
  cake: { name: "Gâteau", price: 27 },
};
export const isItem = (id: string): id is ItemId => id in ITEMS;

export type Inventory = Partial<Record<ItemId, number>>;
export type Recipe = { id: string; out: ItemId; qty: number; minutes: number; inputs: Inventory };

export type BuildingId = "planter" | "pot" | "coop" | "oven" | "flowers" | "tree" | "fountain";
/**
 * Objets posables. `size` : [largeur, hauteur] en cases. `requires` : déblocage de salle nécessaire.
 * `verb` vide = décoration (pas de production).
 */
export const BUILDINGS: Record<BuildingId, { name: string; size: [number, number]; cost: number; max?: number; verb: string; recipes: Recipe[]; requires?: string }> = {
  planter: {
    name: "Bac potager", size: [2, 2], cost: 20, verb: "Planter",
    recipes: [
      { id: "wheat", out: "wheat", qty: 2, minutes: 2, inputs: { coins: 1 } },
      { id: "carrot", out: "carrot", qty: 2, minutes: 10, inputs: { coins: 3 } },
      { id: "corn", out: "corn", qty: 2, minutes: 30, inputs: { coins: 6 } },
      { id: "strawberry", out: "strawberry", qty: 2, minutes: 120, inputs: { coins: 15 } },
    ],
  },
  pot: {
    name: "Pot de fleurs", size: [1, 1], cost: 8, verb: "Semer",
    recipes: [{ id: "flower", out: "flower", qty: 1, minutes: 5, inputs: { coins: 1 } }], // « flower » : la graine ; la fleur qui pousse est tirée au sort (flowers.ts)
  },
  coop: {
    name: "Poulailler", size: [2, 2], cost: 60, max: 1, verb: "Nourrir", requires: "b:coop",
    recipes: [{ id: "egg", out: "egg", qty: 1, minutes: 20, inputs: { wheat: 1 } }],
  },
  oven: {
    name: "Four à pain", size: [2, 2], cost: 120, max: 1, verb: "Cuire",
    recipes: [
      { id: "bread", out: "bread", qty: 1, minutes: 15, inputs: { wheat: 3 } },
      { id: "cake", out: "cake", qty: 1, minutes: 60, inputs: { wheat: 1, egg: 1, strawberry: 1 } },
    ],
    requires: "b:oven",
  },
  flowers: { name: "Jardinière", size: [1, 1], cost: 15, verb: "", recipes: [], requires: "cosmetic:decor" },
  tree: { name: "Agrume en pot", size: [2, 2], cost: 25, verb: "", recipes: [], requires: "cosmetic:decor" },
  fountain: { name: "Vasque", size: [2, 2], cost: 80, max: 1, verb: "", recipes: [], requires: "cosmetic:decor" },
};
/** Plafond de départ des objets sans `max` : l'histoire le relève (clés « cap:bac:5 » dans les déblocages personnels). */
export const BASE_CAP: Partial<Record<BuildingId, number>> = { planter: 5, pot: 5 };
export const isBuilding = (id: string): id is BuildingId => id in BUILDINGS;
