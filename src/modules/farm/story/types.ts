// Moteur d'histoire : un chapitre = un fichier (ch1.ts…) qui décrit ses personnages, ses actes et ses quêtes.
import type { BuildingId, Inventory, ItemId } from "../catalog.ts";

export type Who = "mirabelle" | "pistache" | "colonel" | "zinnia";
export type Line = { who: Who; text: string };

/** But d'une quête : livrer des objets, posséder des bâtiments, ou récolter N fois (compteur du chapitre). */
export type Goal =
  | { kind: "deliver"; items: Inventory }
  | { kind: "own"; building: BuildingId; n: number }
  | { kind: "harvest"; item: ItemId; n: number };

export type Reward = { coins?: number; items?: Inventory; unlocks?: string[] };

export type Quest = {
  id: string;
  act: number;
  title: string;
  intro: Line[];
  outro: Line[];
  goal: Goal;
  reward: Reward;
  page: { title: string; text: string }; // page du journal de Mirabelle, gagnée en finissant la quête
};

export type Act = { n: number; day: number; title: string; teaser: string };

export type Chapter = {
  n: number;
  title: string;
  trophy: string; // titre gagné en finissant le chapitre
  acts: Act[];
  quests: Quest[];
};
