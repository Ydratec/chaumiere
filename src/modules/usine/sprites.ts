// Usine de Noël : sprites pixel art (vue 3/4, grille de 32) des personnages, des machines et de la logistique.
// Tout est généré par tools/usine-pixel (python3 build3.py ../../public/usine) et rangé dans public/usine/.
// Le design du jeu (recettes, débits, énergie, progression) est décrit dans le document « Usine de Noël — Game design ».
//
// Placement : chaque sprite donne `origin` = position, dans sa case, du coin haut-gauche de son emprise.
// On dessine la case à (tuile.x * 32 - origin.x, tuile.y * 32 - origin.y) et on trie par bas d'emprise.
import { SPECIES, type Character } from "@/src/modules/characters/catalog";

export const TILE = 32;

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

// ---------- étapes ----------
/** Les 8 étapes de l'usine (contenu de chaque étape : public/usine/etape-N/etape.json). */
export const STAGES = [
  { n: 1, name: "Atelier du lutin", family: "art" },
  { n: 2, name: "Atelier équipé", family: "art" },
  { n: 3, name: "Petite fabrique", family: "art", belt: "bois" },
  { n: 4, name: "Manufacture à vapeur", family: "vap", belt: "fonte" },
  { n: 5, name: "Usine électrique", family: "elec", belt: "metal" },
  { n: 6, name: "Usine automatisée", family: "robot", belt: "express" },
  { n: 7, name: "Complexe industriel", family: "elec", belt: "metal" },
  { n: 8, name: "Multinationale", family: "elec", belt: "metal" },
] as const;

/** Chemin d'un asset d'étape, ex. stageAsset(4, "steam_press_s.png"). */
export const stageAsset = (stage: number, file: string) => `/usine/etape-${stage}/${file}`;

// ---------- objets orientables (machines, bras, séparateurs, tuyaux, véhicules…) ----------
/**
 * Orientation = sens du flux (ou de la marche) à l'écran. Chaque orientation montre une autre face de l'objet :
 * - "e" : flux ouest → est, on voit la façade (panneau de commande) ;
 * - "s" : flux nord → sud, on voit le bout de sortie ;
 * - "w" : flux est → ouest, on voit l'arrière (tuyaux, câbles, trappes) ;
 * - "n" : flux sud → nord, on voit le bout d'entrée.
 */
export type Orientation = "e" | "s" | "w" | "n";
export const ORIENTATIONS: readonly Orientation[] = ["e", "s", "w", "n"];
export const objectSheet = (stage: number, name: string, o: Orientation) => stageAsset(stage, `${name}_${o}.png`);

/** Ce que décrit `etape.json` pour un objet dans une orientation. */
export type OrientedSprite = {
  file: string;
  frame: [number, number];
  frames: number;
  footprint: [number, number];
  origin: [number, number];
  face: string;
  ports?: { in: { side: "N" | "E" | "S" | "W"; tile: [number, number] }; out: { side: "N" | "E" | "S" | "W"; tile: [number, number] } };
  hand?: [number, number][];
};

/** Coin haut-gauche (en pixels écran) où dessiner la case d'un sprite posé sur la tuile (tx, ty). */
export const spriteDrawPos = (s: Pick<OrientedSprite, "origin">, tx: number, ty: number) => ({ x: tx * TILE - s.origin[0], y: ty * TILE - s.origin[1] });
/** Clé de tri d'affichage : le bas de l'emprise (plus grand = dessiné plus tard). */
export const spriteSortKey = (s: Pick<OrientedSprite, "footprint">, ty: number) => (ty + s.footprint[1]) * TILE;

// ---------- tapis ----------
/** Tapis : 12 lignes (E, W, S, N, puis les 8 virages) × 4 images ; deux voies à ±5 px du centre. */
export const BELT_ROWS = ["E", "W", "S", "N", "W>S", "S>W", "E>S", "S>E", "W>N", "N>W", "E>N", "N>E"] as const;
export type BeltTile = (typeof BELT_ROWS)[number];
export type BeltKind = "bois" | "fonte" | "metal" | "express";
/** Débit d'un tapis, en objets par seconde (les deux voies ensemble). */
export const BELT_SPEED: Record<BeltKind, number> = { bois: 2, fonte: 4, metal: 8, express: 16 };
export const beltSheet = (kind: BeltKind) => `/usine/tapis/${kind}.png`;
export const beltRect = (tile: BeltTile, frame: number) => ({ x: (frame % FRAMES) * TILE, y: BELT_ROWS.indexOf(tile) * TILE, w: TILE, h: TILE });

// ---------- objets 16 × 16 ----------
export const ITEMS = [
  "sable", "bois", "branche", "fil", "sapin_brut", "pigment_rouge", "pigment_vert", "pigment_or", "pigment_bleu",
  "verre_fondu", "verre", "perles", "eclats", "planche", "sciure", "crochet",
  "peinture_rouge", "peinture_vert", "peinture_or", "peinture_bleu",
  "boule_transparente", "boule_rouge", "boule_verte", "boule_or", "boule_bleue",
  "boule_finie_rouge", "boule_finie_vert", "boule_finie_or", "boule_finie_bleu",
  "etoile_bois", "etoile_doree", "ruban", "guirlande", "couronne", "sapin_decore", "cadeau", "piece",
] as const;
export type Item = (typeof ITEMS)[number];
export const ITEM_SHEET = "/usine/commun/objets_16x16.png";
export const itemRect = (item: Item) => ({ x: ITEMS.indexOf(item) * 16, y: 0, w: 16, h: 16 });
