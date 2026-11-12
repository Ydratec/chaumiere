// Usine de Noël : sprites pixel art (vue 3/4, grille de 32) des personnages, des machines et des tapis.
// Tout est généré par tools/usine-pixel (python3 build_all.py ../../public/usine) et rangé dans public/usine/.
//
// Projection commune : un objet de hauteur Z posé sur une emprise de W × H tuiles est dessiné dans une case
// de W*32 × (H*32 + Z + marge). Le bas de la case est le bas de l'emprise : on ancre en bas et on trie par bas
// d'emprise. Les tapis suivent la même règle (hauteur 5), donc les entrées/sorties des machines tombent pile dessus.
import { SPECIES, type Character } from "@/src/modules/characters/catalog";

// ---------- personnages (32 × 48) ----------
export const FRAME_W = 32;
export const FRAME_H = 48;
export const FRAMES = 4;
export const DIRECTIONS = ["down", "left", "right", "up"] as const;
export const ANIMATIONS = ["idle", "walk", "work", "carry"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export type Animation = (typeof ANIMATIONS)[number];

/** Images par seconde conseillées pour chaque animation. */
export const FPS: Record<Animation, number> = { idle: 3, walk: 8, work: 8, carry: 8 };
/** Les pieds sont en (16, 46) dans la case : c'est le point à poser au centre de la tuile. */
export const FEET = { x: 16, y: 46 };
/** Bas de l'objet porté (icône 16×16) : au-dessus de la tête, 4 px plus haut avec un chapeau. */
export const CARRY = { x: 16, y: 8 };

/** Accessoires dessinés pour l'usine : ceux du catalogue, plus le bonnet de Noël. */
export const USINE_ACCESSORIES = ["bow", "flower", "glasses", "scarf", "hat", "crown", "witch", "santa"] as const;
export type UsineAccessory = (typeof USINE_ACCESSORIES)[number];

/** Planche du corps : une par couleur pour les espèces de base, une seule pour les personnages uniques. */
export function bodySheet(c: Pick<Character, "species" | "color">) {
  return SPECIES[c.species].unique ? `/usine/personnages/${c.species}.png` : `/usine/personnages/${c.species}-${c.color}.png`;
}
/** Lutins (PNJ) : le lutin de départ et le lutin assistant de l'étape 2. */
export const NPC_SHEETS = { lutin: "/usine/personnages/lutin.png", assistant: "/usine/personnages/lutin-assistant.png" } as const;

/** Calque d'accessoire (null si aucun). `santa` permet de mettre le bonnet de Noël à tout le monde. */
export function accessorySheet(species: Character["species"], accessory: UsineAccessory | null) {
  return accessory ? `/usine/accessoires/${species}-${accessory}.png` : null;
}

/** Position (en pixels) de la case à découper dans une planche de personnage. */
export function frameRect(animation: Animation, direction: Direction, frame: number) {
  const row = ANIMATIONS.indexOf(animation) * DIRECTIONS.length + DIRECTIONS.indexOf(direction);
  return { x: (frame % FRAMES) * FRAME_W, y: row * FRAME_H, w: FRAME_W, h: FRAME_H };
}

/** Image d'animation à afficher au temps `ms` (pour une boucle de jeu). */
export const frameAt = (animation: Animation, ms: number) => Math.floor((ms / 1000) * FPS[animation]) % FRAMES;

// ---------- étapes, machines, tapis ----------
/** Les 8 étapes de l'usine (détail de chaque étape : public/usine/etape-N/etape.json). */
export const STAGES = [
  { n: 1, name: "Atelier du lutin", family: "art" },
  { n: 2, name: "Atelier équipé", family: "art" },
  { n: 3, name: "Petite fabrique", family: "art", belt: "bois" },
  { n: 4, name: "Manufacture à vapeur", family: "vap", belt: "fonte" },
  { n: 5, name: "Usine électrique", family: "elec", belt: "metal" },
  { n: 6, name: "Usine automatisée", family: "robot", belt: "metal" },
  { n: 7, name: "Complexe industriel", family: "elec", belt: "metal" },
  { n: 8, name: "Multinationale", family: "elec", belt: "metal" },
] as const;

/** Chemin d'un asset d'étape, ex. stageAsset(4, "steam_press_v.png"). */
export const stageAsset = (stage: number, file: string) => `/usine/etape-${stage}/${file}`;

/**
 * Machines : chacune existe en deux orientations.
 * - "h" (vue de face) : le tapis entre à l'ouest et sort à l'est, sur la rangée du bas de l'emprise.
 * - "v" (vue de côté) : le tapis entre au nord et sort au sud, sur la colonne (W-1)/2 de l'emprise.
 */
export type Orientation = "h" | "v";
export const machineSheet = (stage: number, machine: string, o: Orientation) => stageAsset(stage, `${machine}_${o}.png`);

/** Tapis : 12 lignes (E, W, S, N, puis les 8 virages) × 4 images. */
export const BELT_ROWS = ["E", "W", "S", "N", "W>S", "S>W", "E>S", "S>E", "W>N", "N>W", "E>N", "N>E"] as const;
export type BeltTile = (typeof BELT_ROWS)[number];
export const beltSheet = (kind: "bois" | "fonte" | "metal") => `/usine/tapis/${kind}.png`;
export const beltRect = (tile: BeltTile, frame: number) => ({ x: (frame % FRAMES) * 32, y: BELT_ROWS.indexOf(tile) * 32, w: 32, h: 32 });
