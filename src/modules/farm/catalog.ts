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
  | "flower" | "poppy" | "tulip" | "sunflower" | "lavender" | "rose" | "orchid" | "moonflower" // les fleurs : voir flowers.ts
  | "sugarcane" | "sugar" | "candy" | "jam" // atelier de cuisine
  | "pumpkin" | "lantern" | "pie"; // Fête des Brumes

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
  sugarcane: { name: "Canne à sucre", price: 2 },
  sugar: { name: "Sucre", price: 6 },
  candy: { name: "Bonbon", price: 6 },
  jam: { name: "Confiture", price: 60 },
  pumpkin: { name: "Citrouille", price: 2 },
  lantern: { name: "Lanterne", price: 4 },
  pie: { name: "Tarte à la citrouille", price: 18 },
};
export const isItem = (id: string): id is ItemId => id in ITEMS;

export type Inventory = Partial<Record<ItemId, number>>;
/** `label` : nom affiché quand plusieurs recettes donnent le même objet (« Bonbons à la fraise »). */
export type Recipe = { id: string; out: ItemId; qty: number; minutes: number; inputs: Inventory; label?: string };

export type BuildingId = "planter" | "pot" | "coop" | "oven" | "workshop" | "flowers" | "tree" | "fountain" | "pumpkins";
/**
 * Objets posables. `size` : [largeur, hauteur] en cases. `requires` : déblocage de salle nécessaire.
 * `queue` : nombre de recettes qu'on peut mettre en attente derrière celle en cours (les bâtiments, pas les bacs ni les pots).
 * `verb` vide = décoration (pas de production).
 */
export const BUILDINGS: Record<BuildingId, { name: string; size: [number, number]; cost: number; max?: number; verb: string; recipes: Recipe[]; requires?: string; queue?: number }> = {
  planter: {
    name: "Bac potager", size: [2, 2], cost: 20, verb: "Planter",
    recipes: [
      { id: "wheat", out: "wheat", qty: 2, minutes: 2, inputs: { coins: 1 } },
      { id: "carrot", out: "carrot", qty: 2, minutes: 10, inputs: { coins: 3 } },
      { id: "corn", out: "corn", qty: 2, minutes: 30, inputs: { coins: 6 } },
      { id: "strawberry", out: "strawberry", qty: 2, minutes: 120, inputs: { coins: 15 } },
      { id: "sugarcane", out: "sugarcane", qty: 3, minutes: 15, inputs: { coins: 2 } },
      { id: "pumpkin", out: "pumpkin", qty: 3, minutes: 25, inputs: { coins: 3 } },
    ],
  },
  pot: {
    name: "Pot de fleurs", size: [1, 1], cost: 8, verb: "Semer",
    recipes: [{ id: "flower", out: "flower", qty: 1, minutes: 5, inputs: { coins: 1 } }], // « flower » : la graine ; la fleur qui pousse est tirée au sort (flowers.ts)
  },
  coop: {
    name: "Poulailler", size: [2, 2], cost: 60, max: 1, verb: "Nourrir", requires: "b:coop", queue: 2,
    recipes: [{ id: "egg", out: "egg", qty: 1, minutes: 20, inputs: { wheat: 1 } }],
  },
  oven: {
    name: "Four à pain", size: [2, 2], cost: 120, max: 1, verb: "Cuire", queue: 3,
    recipes: [
      { id: "bread", out: "bread", qty: 1, minutes: 15, inputs: { wheat: 3 } },
      { id: "cake", out: "cake", qty: 1, minutes: 60, inputs: { wheat: 1, egg: 1, strawberry: 1 } },
      { id: "pie", out: "pie", qty: 1, minutes: 40, inputs: { pumpkin: 2, egg: 1, wheat: 1 }, label: "Tarte à la citrouille" },
    ],
    requires: "b:oven",
  },
  workshop: {
    name: "Atelier de cuisine", size: [2, 2], cost: 100, max: 1, verb: "Cuisiner", queue: 3,
    recipes: [
      { id: "sugar", out: "sugar", qty: 1, minutes: 8, inputs: { sugarcane: 2 } },
      { id: "candy-strawberry", out: "candy", qty: 6, minutes: 20, inputs: { sugar: 1, strawberry: 1 }, label: "Bonbons à la fraise" },
      { id: "candy-flower", out: "candy", qty: 4, minutes: 20, inputs: { sugar: 1, flower: 2 }, label: "Bonbons à la fleur" },
      { id: "jam", out: "jam", qty: 1, minutes: 45, inputs: { strawberry: 3, sugar: 2 }, label: "Confiture de fraises" },
      { id: "lantern", out: "lantern", qty: 2, minutes: 10, inputs: { pumpkin: 1, coins: 4 }, label: "Lanternes (citrouille et bougie)" },
    ],
  },
  flowers: { name: "Jardinière", size: [1, 1], cost: 15, verb: "", recipes: [], requires: "cosmetic:decor" },
  tree: { name: "Agrume en pot", size: [2, 2], cost: 25, verb: "", recipes: [], requires: "cosmetic:decor" },
  fountain: { name: "Vasque", size: [2, 2], cost: 80, max: 1, verb: "", recipes: [], requires: "cosmetic:decor" },
  pumpkins: { name: "Citrouilles sculptées", size: [1, 1], cost: 10, verb: "", recipes: [], requires: "cosmetic:pumpkins" },
};
/** Plafond de départ des objets sans `max` : l'histoire le relève (clés « cap:bac:5 » dans les déblocages personnels). */
export const BASE_CAP: Partial<Record<BuildingId, number>> = { planter: 5, pot: 5 };
export const isBuilding = (id: string): id is BuildingId => id in BUILDINGS;
