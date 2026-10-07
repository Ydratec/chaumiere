// Personnages : espèces, couleurs, accessoires. Certains s'achètent avec les pièces de la serre,
// la couronne se débloque par un projet de salle. Tout est réglable ici.

export const SPECIES = {
  cat: { name: "Chat", price: 0 },
  dog: { name: "Chien", price: 0 },
  bunny: { name: "Lapin", price: 80 },
  duck: { name: "Canard", price: 120 },
  turtle: { name: "Tortue", price: 120 },
  fish: { name: "Poisson", price: 200 },
} as const;
export type Species = keyof typeof SPECIES;

/** Couleurs (pelage, plumage, écaille…) : mêmes teintes que les robes de chat. */
export const COLORS = [
  { fur: "#f2a65a", dark: "#c9722b", name: "Roux" },
  { fur: "#3f3f46", dark: "#27272a", name: "Noir", night: true },
  { fur: "#a1a1aa", dark: "#71717a", name: "Gris" },
  { fur: "#f4f4f5", dark: "#d4d4d8", name: "Blanc" },
  { fur: "#ead9b8", dark: "#c9b48a", name: "Crème" },
  { fur: "#8b5a3c", dark: "#6b412a", name: "Brun", night: true },
  { fur: "#94a3b8", dark: "#64748b", name: "Bleu gris" },
  { fur: "#7cb87a", dark: "#4f8a4d", name: "Vert" },
] as const;

/** `requires` : déblocage de salle (projet de la serre) au lieu d'un prix. */
export const ACCESSORIES: Record<string, { name: string; price: number; requires?: string }> = {
  bow: { name: "Nœud", price: 30 },
  flower: { name: "Fleur", price: 30 },
  glasses: { name: "Lunettes", price: 40 },
  scarf: { name: "Écharpe", price: 50 },
  hat: { name: "Chapeau", price: 60 },
  crown: { name: "Couronne", price: 0, requires: "cosmetic:crown" },
};
export type Accessory = keyof typeof ACCESSORIES;

export type Character = { species: Species; color: number; accessory: Accessory | null };

const isSpecies = (s: unknown): s is Species => typeof s === "string" && s in SPECIES;
const isAccessory = (a: unknown): a is Accessory => typeof a === "string" && a in ACCESSORIES;

/** Personnage par défaut, stable à partir du pseudo (un chat d'une couleur au hasard). */
export function defaultCharacter(name: string): Character {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { species: "cat", color: h % 8, accessory: null };
}

/** Lit un personnage enregistré (JSON), ou le personnage par défaut s'il est absent/invalide. */
export function readCharacter(raw: unknown, name: string): Character {
  const c = raw as Partial<Character> | null;
  if (!c || !isSpecies(c.species) || !Number.isInteger(c.color) || c.color! < 0 || c.color! >= COLORS.length) return defaultCharacter(name);
  return { species: c.species, color: c.color!, accessory: isAccessory(c.accessory) ? c.accessory : null };
}

/** Clé d'objet acheté (dans farm_items). */
export const skinKey = (kind: "species" | "accessory", id: string) => `skin:${kind}:${id}`;

/** Ce personnage est-il utilisable (gratuit, acheté, ou débloqué par la salle) ? */
export function canWear(c: Character, owned: string[], unlocks: string[]) {
  const sp = SPECIES[c.species].price === 0 || owned.includes(skinKey("species", c.species));
  const acc = !c.accessory || (ACCESSORIES[c.accessory].requires
    ? unlocks.includes(ACCESSORIES[c.accessory].requires!)
    : owned.includes(skinKey("accessory", c.accessory)));
  return sp && acc;
}
