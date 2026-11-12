// Usine de Noël : sprites pixel art 32×32 (vue 3/4) des personnages de chacun.
// Planches générées par tools/usine-pixel (python3 build_animals.py public/usine), rangées dans public/usine/.
// Chaque planche : 4 colonnes (images d'animation) × 16 lignes (animation × direction), cases de 32×32.
// Les accessoires sont des calques de même format, à poser par-dessus le corps.
import { SPECIES, type Character } from "@/src/modules/characters/catalog";

export const FRAME = 32;
export const FRAMES = 4;
export const DIRECTIONS = ["down", "left", "right", "up"] as const;
export const ANIMATIONS = ["idle", "walk", "work", "carry"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export type Animation = (typeof ANIMATIONS)[number];

/** Images par seconde conseillées pour chaque animation. */
export const FPS: Record<Animation, number> = { idle: 3, walk: 8, work: 8, carry: 8 };
/** Les pieds sont en (16, 30) dans la case : c'est le point à poser sur la tuile. */
export const FEET = { x: 16, y: 30 };
/** Bas de l'objet porté au-dessus de la tête (icône 16×16 de public/usine/atelier/items_16x16.png). */
export const CARRY = { x: 16, y: 4 };

/** Accessoires dessinés pour l'usine : ceux du catalogue, plus le bonnet de Noël. */
export const USINE_ACCESSORIES = ["bow", "flower", "glasses", "scarf", "hat", "crown", "witch", "santa"] as const;
export type UsineAccessory = (typeof USINE_ACCESSORIES)[number];

/** Planche du corps : une par couleur pour les espèces de base, une seule pour les personnages uniques. */
export function bodySheet(c: Pick<Character, "species" | "color">) {
  return SPECIES[c.species].unique ? `/usine/personnages/${c.species}.png` : `/usine/personnages/${c.species}-${c.color}.png`;
}

/** Calque d'accessoire (null si aucun). `santa` permet de mettre le bonnet de Noël à tout le monde. */
export function accessorySheet(species: Character["species"], accessory: UsineAccessory | null) {
  return accessory ? `/usine/accessoires/${species}-${accessory}.png` : null;
}

/** Position (en pixels) de la case à découper dans la planche. */
export function frameRect(animation: Animation, direction: Direction, frame: number) {
  const row = ANIMATIONS.indexOf(animation) * DIRECTIONS.length + DIRECTIONS.indexOf(direction);
  return { x: (frame % FRAMES) * FRAME, y: row * FRAME, w: FRAME, h: FRAME };
}

/** Les 8 étapes de l'usine, de l'atelier artisanal à la multinationale (détail : public/usine/etapes.json). */
export const STAGES = [
  { n: 1, name: "Atelier du lutin", folder: "atelier" },
  { n: 2, name: "Atelier équipé", folder: "etape-2" },
  { n: 3, name: "Petite fabrique", folder: "etape-3" },
  { n: 4, name: "Manufacture à vapeur", folder: "etape-4" },
  { n: 5, name: "Usine électrique", folder: "etape-5" },
  { n: 6, name: "Usine automatisée", folder: "etape-6" },
  { n: 7, name: "Complexe industriel", folder: "etape-7" },
  { n: 8, name: "Multinationale", folder: "etape-8" },
] as const;

/** Chemin d'un asset d'étape, ex. stageAsset(4, "station_boiler.png"). */
export const stageAsset = (stage: number, file: string) => `/usine/${STAGES[stage - 1]?.folder ?? "atelier"}/${file}`;

/** Image d'animation à afficher au temps `ms` (pour une boucle de jeu). */
export const frameAt = (animation: Animation, ms: number) => Math.floor((ms / 1000) * FPS[animation]) % FRAMES;
