// Projets de salle : tout le monde y contribue ; une fois rempli, le bonus est débloqué pour toute la salle.
import type { Inventory, ItemId } from "./catalog.ts";

export type Project = {
  key: string; // clé enregistrée dans room_unlocks
  kind: "game" | "pack" | "cosmetic" | "upgrade";
  title: string;
  desc: string;
  needs: Inventory;
  after?: string; // n'apparaît qu'une fois ce projet-là terminé
};

export const PROJECTS: Project[] = [
  { key: "game:battleship", kind: "game", title: "Bataille navale", desc: "Débloque le jeu pour toute la salle.", needs: { wheat: 30, carrot: 10 } },
  { key: "pack:voyages", kind: "pack", title: "Questions « Voyages »", desc: "De nouvelles questions du jour sur les voyages.", needs: { carrot: 15, egg: 6 } },
  { key: "upgrade:land", kind: "upgrade", title: "Serre agrandie", desc: "Quatre rangées de plus dans chaque serre.", needs: { wheat: 40, corn: 10 } },
  { key: "cosmetic:decor", kind: "cosmetic", title: "Décorations", desc: "Jardinières, agrumes et fontaine pour embellir sa serre.", needs: { carrot: 20, strawberry: 4 }, after: "upgrade:land" },
  { key: "game:orapa", kind: "game", title: "Orapa Mine", desc: "Débloque le jeu de déduction pour toute la salle.", needs: { bread: 10, egg: 15, corn: 10 }, after: "game:battleship" },
  { key: "pack:souvenirs", kind: "pack", title: "Questions « Souvenirs »", desc: "Des questions pour se raconter.", needs: { bread: 12, strawberry: 6 }, after: "pack:voyages" },
  { key: "upgrade:coop2", kind: "upgrade", title: "Deuxième poulailler", desc: "Chacun peut construire un poulailler de plus.", needs: { egg: 20, corn: 15 }, after: "upgrade:land" },
  { key: "cosmetic:hues", kind: "cosmetic", title: "Nouvelles couleurs", desc: "Quatre teintes d'app en plus dans le profil.", needs: { strawberry: 10, bread: 8 }, after: "cosmetic:decor" },
  { key: "cosmetic:crown", kind: "cosmetic", title: "Couronne", desc: "Une couronne pour le personnage de chacun.", needs: { cake: 3, flower: 15 }, after: "cosmetic:decor" },
  { key: "upgrade:speed", kind: "upgrade", title: "Engrais", desc: "Tout pousse et cuit 25 % plus vite.", needs: { cake: 5, bread: 10 }, after: "upgrade:coop2" },
  { key: "pack:etsi", kind: "pack", title: "Questions « Et si… »", desc: "Des questions pour imaginer.", needs: { cake: 4, egg: 20 }, after: "pack:souvenirs" },
];

export const GAME_LOCKS: Record<string, string> = { battleship: "game:battleship", orapa: "game:orapa" };

/** Projets en cours : pas encore débloqués, et dont le prérequis l'est. */
export const activeProjects = (unlocks: string[]) =>
  PROJECTS.filter((p) => !unlocks.includes(p.key) && (!p.after || unlocks.includes(p.after)));

/** Combien il reste à donner pour cet objet. */
export const remaining = (p: Project, progress: Inventory, item: ItemId) => Math.max(0, (p.needs[item] ?? 0) - (progress[item] ?? 0));
export const isComplete = (p: Project, progress: Inventory) =>
  (Object.keys(p.needs) as ItemId[]).every((k) => remaining(p, progress, k) === 0);
