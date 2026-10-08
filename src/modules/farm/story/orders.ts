// Commandes du village : 3 par jour et par joueur, tirées d'une graine (joueur + jour) donc toujours les mêmes ce jour-là.
import { ITEMS, type Inventory, type ItemId } from "../catalog.ts";
import type { Who } from "./types.ts";

export type NewOrder = { slot: number; npc: Who; wants: Inventory; reward: number };

const ASKERS: Who[] = ["pistache", "zinnia", "colonel", "mirabelle"];
/** Quantités possibles pour chaque objet commandable (min, max). */
const RANGE: Partial<Record<ItemId, [number, number]>> = {
  wheat: [4, 10], carrot: [3, 7], corn: [2, 5], strawberry: [1, 4], flower: [3, 7], egg: [2, 5], bread: [2, 5], cake: [1, 2],
};
export const ORDER_PAY = 1.5; // × la valeur de vente
export const ASKS: Record<Who, string[]> = {
  pistache: ["Je n'ai pas volé ça. Je l'ai… emprunté d'avance.", "Un ami a faim. Un ami très poilu.", "Marché conclu, pas de questions."],
  zinnia: ["C'est pour une surprise. Ne dis rien !", "Pour la décoration de la place.", "Si tu as un peu de temps… pas de pression."],
  colonel: ["Hou. Pour le conseil. Ne vous méprenez pas.", "Le hameau a besoin de vous. Discrètement.", "Livraison avant la nuit, si possible."],
  mirabelle: ["Pour la cuisine du dimanche, mon petit chou.", "J'ai une idée. Ne me demande pas laquelle.", "Pour une vieille amie qui ne dit pas son nom."],
};

/** Générateur déterministe (mulberry32) à partir d'un texte. */
function rng(seed: string) {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353) << 13 | h >>> 19;
  let a = h;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Les 3 commandes du jour, avec des objets que le joueur peut produire (`available`). */
export function dailyOrders(user: string, day: string, available: ItemId[]): NewOrder[] {
  const items = available.filter((i) => RANGE[i]);
  const r = rng(`${user}:${day}`);
  return [0, 1, 2].map((slot) => {
    const count = Math.min(items.length, slot === 0 ? 1 : 1 + Math.floor(r() * 2));
    const pool = [...items];
    const wants: Inventory = {};
    for (let i = 0; i < count; i++) {
      const it = pool.splice(Math.floor(r() * pool.length), 1)[0];
      const [lo, hi] = RANGE[it]!;
      wants[it] = lo + Math.floor(r() * (hi - lo + 1));
    }
    const value = Object.entries(wants).reduce((n, [k, v]) => n + ITEMS[k as ItemId].price * (v ?? 0), 0);
    return { slot, npc: ASKERS[Math.floor(r() * ASKERS.length)], wants, reward: Math.max(5, Math.round((value * ORDER_PAY) / 5) * 5) };
  });
}

/** Objets que le joueur peut produire, selon ses déblocages (« b:coop » : poulailler, « b:oven » : four). */
export const producible = (unlocks: string[]): ItemId[] => [
  "wheat", "carrot", "corn", "strawberry", "flower",
  ...(unlocks.includes("b:coop") ? (["egg"] as ItemId[]) : []),
  ...(unlocks.includes("b:oven") ? (["bread", "cake"] as ItemId[]) : []),
];
