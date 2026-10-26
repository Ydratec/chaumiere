// Projets de salle : tout le monde y contribue ; une fois rempli, le bonus est débloqué pour toute la salle.
import type { Inventory, ItemId } from "./catalog.ts";

export type Project = {
  key: string; // clé enregistrée dans room_unlocks
  kind: "game" | "pack" | "cosmetic" | "upgrade" | "event";
  title: string;
  desc: string;
  needs: Inventory;
  after?: string; // n'apparaît qu'une fois ce projet-là terminé
  until?: string; // ISO : passé cette date, le projet disparaît s'il n'est pas fini (événement)
  from?: string; // ISO : le projet n'apparaît qu'à partir de cette date
  bonus?: Inventory; // versé à chaque membre de la salle quand le projet est terminé
};

/** Fête des Brumes : le grand bocal de bonbons, à remplir à toute la salle avant la nuit du 31 octobre. */
const BOCAL_UNTIL = "2026-11-01T00:00:00+01:00";
/** Toutes les fenêtres : les lanternes de la Fête, dès que Mirabelle en donne la recette (fin de l'acte 3). */
const LANTERNS_FROM = "2026-10-29T10:00:00+01:00";

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
  { key: "cosmetic:pumpkins", kind: "event", title: "Le grand bocal · palier 1", desc: "Débloque les citrouilles sculptées, à poser dans sa serre.", needs: { candy: 150 }, until: BOCAL_UNTIL },
  { key: "cosmetic:witchhat", kind: "event", title: "Le grand bocal · palier 2", desc: "Un chapeau de sorcière pour le personnage de chacun.", needs: { candy: 400 }, after: "cosmetic:pumpkins", until: BOCAL_UNTIL },
  { key: "event:candyrain", kind: "event", title: "Le grand bocal · palier 3", desc: "Pluie de bonbons : chacun reçoit 300 pièces et une fleur de lune.", needs: { candy: 800 }, after: "cosmetic:witchhat", until: BOCAL_UNTIL, bonus: { coins: 300, moonflower: 1 } },
  { key: "event:lanterns", kind: "event", title: "Toutes les fenêtres", desc: "120 lanternes pour la Fête des Brumes, à allumer à toute la salle avant minuit le 31 : chacun reçoit 200 pièces et une fleur de lune.", needs: { lantern: 120 }, from: LANTERNS_FROM, until: BOCAL_UNTIL, bonus: { coins: 200, moonflower: 1 } },
  { key: "upgrade:workshop2", kind: "event", title: "Le grand bocal · palier 4", desc: "Un deuxième atelier de cuisine dans chaque serre.", needs: { candy: 1500 }, after: "event:candyrain", until: BOCAL_UNTIL },
];

export const GAME_LOCKS: Record<string, string> = { battleship: "game:battleship", orapa: "game:orapa" };

/** Projets en cours : pas encore débloqués, dont le prérequis l'est, et pas expirés. */
export const activeProjects = (unlocks: string[], now = Date.now()) =>
  PROJECTS.filter((p) => !unlocks.includes(p.key) && (!p.after || unlocks.includes(p.after)) && (!p.from || now >= Date.parse(p.from)) && (!p.until || now < Date.parse(p.until)));

/** Combien il reste à donner pour cet objet. */
export const remaining = (p: Project, progress: Inventory, item: ItemId) => Math.max(0, (p.needs[item] ?? 0) - (progress[item] ?? 0));
export const isComplete = (p: Project, progress: Inventory) =>
  (Object.keys(p.needs) as ItemId[]).every((k) => remaining(p, progress, k) === 0);
