// TCG : cartes, raretés et tirage des boosters (fonctions pures, testées dans tests/unit/tcg.test.ts).
// Ajouter une carte : déposer l'image dans public/tcg/<édition>/<id>.webp et l'ajouter à CARDS.

export type Rarity = "C" | "PC" | "PR" | "GR" | "L";

/** `weight` : chances relatives d'une rareté pour chaque carte d'un booster. */
export const RARITIES: Record<Rarity, { label: string; weight: number; color: string }> = {
  C: { label: "Commune", weight: 60, color: "bg-zinc-200 text-zinc-700" },
  PC: { label: "Peu commune", weight: 25, color: "bg-emerald-100 text-emerald-800" },
  PR: { label: "Plutôt rare", weight: 10, color: "bg-sky-100 text-sky-800" },
  GR: { label: "Grande rareté", weight: 4, color: "bg-violet-100 text-violet-800" },
  L: { label: "Légendaire", weight: 1, color: "bg-amber-200 text-amber-900" },
};

export type Card = { id: string; name: string; rarity: Rarity; ed: string };
const ed1 = (id: string, name: string, rarity: Rarity): Card => ({ id, name, rarity, ed: "ed1" });

export const CARDS: Card[] = [
  ed1("chaumiere", "La Chaumière", "L"),
  ed1("port-blanc", "Port Blanc", "GR"),
  ed1("saint-michel-chef-chef", "Saint-Michel-Chef-Chef", "GR"),
  ed1("eclipse-chez-tardy", "Éclipse chez Tardy", "PR"),
  ed1("raven-s-murder", "Raven's Murder", "PR"),
  ed1("tardy-visite-pekin", "Tardy visite Pékin", "PR"),
  ed1("camping", "Camping", "PC"),
  ed1("concert-pornic", "Concert à Pornic", "PC"),
  ed1("ski-grenoble", "Ski à Grenoble", "PC"),
  ed1("vacances-chez-francois", "Vacances chez François", "PC"),
  ed1("viree-avec-steph", "Virée avec Steph", "PC"),
  ed1("aix", "Aix", "C"),
  ed1("cassis", "Cassis", "C"),
  ed1("nouvel-an-bingo", "Nouvel an : Bingo", "C"),
  ed1("nouvel-an-bowling", "Nouvel an : Bowling", "C"),
  ed1("nouvel-an-koh-lacta", "Nouvel an : Koh Lacta", "C"),
  ed1("obivwak", "OBIVWAK", "C"),
  ed1("pic-nic-chez-boubou", "Pique-nique chez Boubou", "C"),
  ed1("rando-calanque", "Rando dans les calanques", "C"),
  ed1("we-futuroscope", "Week-end au Futuroscope", "C"),
];

export const BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const imageOf = (c: Card) => `/tcg/${c.ed}/${c.id}.webp`;

export const BOOSTER = { size: 5, price: 100 };

/** Tire une rareté (pondérée), puis une carte au hasard parmi celles de cette rareté. */
export function drawCard(rand = Math.random): Card {
  const total = Object.values(RARITIES).reduce((n, r) => n + r.weight, 0);
  let x = rand() * total;
  let rarity: Rarity = "C";
  for (const [k, r] of Object.entries(RARITIES) as [Rarity, (typeof RARITIES)[Rarity]][]) {
    if ((x -= r.weight) < 0) { rarity = k; break; }
  }
  const pool = CARDS.filter((c) => c.rarity === rarity);
  return pool[Math.floor(rand() * pool.length)];
}

export const drawBooster = (rand = Math.random) => Array.from({ length: BOOSTER.size }, () => drawCard(rand).id);
