// État de l'histoire d'un joueur : fonctions pures (testées dans tests/unit/story.test.ts).
import type { Inventory, ItemId } from "../catalog.ts";
import type { Tile } from "../rules.ts";
import type { Chapter, Goal, Quest } from "./types.ts";

const DAY_MS = 86_400_000;

/** Jour du chapitre (1 le jour où il commence ; 0 ou moins avant, l'histoire n'a pas commencé). */
export const chapterDay = (startedAt: string | number, now: number) => Math.floor((now - new Date(startedAt).getTime()) / DAY_MS) + 1;

/** Acte le plus avancé déjà sorti ce jour-là. */
export const openAct = (c: Chapter, day: number) => c.acts.reduce((a, x) => (x.day <= day ? x.n : a), 0);

/** Quêtes finies du chapitre (« legacy » : joueur d'avant l'histoire, ne compte pas comme progression). */
export const questsDone = (done: string[]) => done.filter((d) => d !== "legacy");

/** Déblocages personnels gagnés par les quêtes finies (bâtiments, plafonds…). */
export function personalUnlocks(c: Chapter, done: string[]) {
  const keys = new Set<string>(done.includes("legacy") ? ["b:coop", "b:oven"] : []);
  for (const q of c.quests) if (done.includes(q.id)) for (const u of q.reward.unlocks ?? []) keys.add(u);
  return [...keys];
}

/** Quête en cours : la première non finie dont l'acte est sorti. null : tout est fait, ou la suite n'est pas encore sortie. */
export function currentQuest(c: Chapter, done: string[], day: number): Quest | null {
  const act = openAct(c, day);
  const next = c.quests.find((q) => !done.includes(q.id));
  return next && next.act <= act ? next : null;
}

/** Prochain acte pas encore sorti (pour « prochain épisode dans N jours »). */
export const nextAct = (c: Chapter, day: number) => c.acts.find((a) => a.day > day && c.quests.some((q) => q.act === a.n));

/** Quantités à livrer, augmentées ou réduites par le rattrapage. */
export const scaled = (items: Inventory, cost: number): Inventory =>
  Object.fromEntries(Object.entries(items).map(([k, v]) => [k, Math.max(1, Math.ceil((v ?? 0) * cost))]));

export type GoalProgress = { have: number; need: number; label: string; items?: Inventory };

/** Où en est-on du but ? `stats` : compteurs du chapitre ; `cost` : coefficient du rattrapage. */
export function goalProgress(g: Goal, inv: Inventory, tiles: Tile[], stats: Record<string, number>, cost = 1): GoalProgress {
  switch (g.kind) {
    case "deliver": {
      const need = scaled(g.items, cost);
      const entries = Object.entries(need) as [ItemId, number][];
      const have = entries.reduce((n, [k, v]) => n + Math.min(inv[k] ?? 0, v), 0);
      return { have, need: entries.reduce((n, [, v]) => n + v, 0), label: "À livrer", items: need };
    }
    case "own":
      return { have: Math.min(g.n, tiles.filter((t) => t.kind === g.building).length), need: g.n, label: "À construire" };
    case "harvest":
      return { have: Math.min(g.n, stats[`harvest:${g.item}`] ?? 0), need: g.n, label: "À récolter" };
  }
}
export const goalMet = (p: GoalProgress) => p.have >= p.need;
