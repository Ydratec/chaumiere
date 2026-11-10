// TCG : cartes, raretés et tirage des boosters (fonctions pures, testées dans tests/unit/tcg.test.ts).
// Ajouter une carte : déposer l'image dans public/tcg/<édition>/<id>.webp et l'ajouter à CARDS.

export type Rarity = "C" | "PC" | "PR" | "GR" | "L";

/** `weight` : chances relatives d'une rareté pour chaque carte d'un booster ; `shine` / `holo` : force du reflet et de l'effet holographique (0..1).
 *  Réglé par simulation avec VARIANTS : la Légendaire est rare (≈ 1 booster sur 25) ; le set normal dure 2 à 3 semaines
 *  (médiane ≈ 26 jours à 2 boosters par jour, ≈ 17 jours à 3) ; les 40 cartes (avec les Arc-en-ciel) demandent des échanges :
 *  une salle de 6 à 3 boosters par jour peut toutes les avoir en un mois environ (médiane ≈ 28 jours). */
export const RARITIES: Record<Rarity, { label: string; weight: number; color: string; shine: number; holo: number }> = {
  C: { label: "Commune", weight: 62.7, color: "bg-zinc-200 text-zinc-700", shine: 0, holo: 0 },
  PC: { label: "Peu commune", weight: 25, color: "bg-emerald-100 text-emerald-800", shine: 0.25, holo: 0 },
  PR: { label: "Plutôt rare", weight: 9, color: "bg-sky-100 text-sky-800", shine: 0.45, holo: 0 },
  GR: { label: "Grande rareté", weight: 2.5, color: "bg-violet-100 text-violet-800", shine: 0.7, holo: 0.25 },
  L: { label: "Légendaire", weight: 0.8, color: "bg-amber-200 text-amber-900", shine: 1, holo: 0.5 },
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

/** `price` : prix d'un booster acheté ; `perDay` : achats maximum par jour (les boosters gratuits ne comptent pas). */
export const BOOSTER = { size: 5, price: 1000, perDay: 3 };

// ---------- Boosters du jour ----------

export type Source = "question" | "win" | "buy";
/** Clés des boosters déjà pris (table farm_stats) : une ligne par booster, la base refuse les doublons. */
export const claimKey = { question: (day: string) => `tcg:q:${day}`, win: (day: string) => `tcg:win:${day}`, buy: (day: string, n: number) => `tcg:buy:${day}:${n}` };

/** Gagnants d'un défi : ceux qui ont trouvé avec le meilleur score (plusieurs si ex aequo). */
export function winners(rank: { user: string; solved: boolean; score: number }[]) {
  const solved = rank.filter((r) => r.solved);
  const best = Math.min(...solved.map((r) => r.score));
  return solved.filter((r) => r.score === best).map((r) => r.user);
}

export type Offers = { question: "todo" | "ready" | "done"; win: "ready" | "done" | null; buys: number };
/** Ce que le joueur peut ouvrir aujourd'hui. `taken` : clés déjà prises ; `day` / `yesterday` : jours du défi (Paris). */
export function offersOf(o: { answered: boolean; wonYesterday: boolean; taken: Set<string>; day: string; yesterday: string }): Offers {
  return {
    question: o.taken.has(claimKey.question(o.day)) ? "done" : o.answered ? "ready" : "todo",
    win: !o.wonYesterday ? null : o.taken.has(claimKey.win(o.yesterday)) ? "done" : "ready",
    buys: Array.from({ length: BOOSTER.perDay }, (_, i) => claimKey.buy(o.day, i + 1)).filter((k) => o.taken.has(k)).length,
  };
}

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

// ---------- Versions alternatives : même image, effet en plus, beaucoup plus rares ----------

export type Variant = "rainbow";
/** `chance` : probabilité, pour chaque carte tirée, de sortir dans cette version, selon sa rareté.
 *  Plus forte pour les rares : sinon la Légendaire Arc-en-ciel serait introuvable sans rendre la Légendaire trop facile. */
export const VARIANTS: Record<Variant, { label: string; chance: Record<Rarity, number> }> = {
  rainbow: { label: "Arc-en-ciel", chance: { C: 1 / 10, PC: 1 / 10, PR: 1 / 6, GR: 1 / 4, L: 1 / 2 } },
};
export const VARIANT_IDS = Object.keys(VARIANTS) as Variant[];

/** Une carte possédée : « id » (normale) ou « id@variante ». */
export const keyOf = (id: string, v?: Variant) => (v ? `${id}@${v}` : id);
export const splitKey = (k: string) => {
  const [id, v] = k.split("@");
  return { id, variant: v && v in VARIANTS ? (v as Variant) : undefined };
};

export function drawVariant(rarity: Rarity, rand = Math.random): Variant | undefined {
  let x = rand();
  for (const v of VARIANT_IDS) if ((x -= VARIANTS[v].chance[rarity]) < 0) return v;
  return undefined;
}

/** Un booster : des clés de cartes (voir keyOf). */
export const drawBooster = (rand = Math.random) =>
  Array.from({ length: BOOSTER.size }, () => {
    const c = drawCard(rand);
    return keyOf(c.id, drawVariant(c.rarity, rand));
  });
// ---------- Collection ----------

/** Cartes possédées : clé (voir keyOf) → nombre d'exemplaires. */
export type Owned = Record<string, number>;
const RANK: Rarity[] = ["L", "GR", "PR", "PC", "C"];
/** Collection d'un navigateur (V1 locale) à reprendre en base : une entrée par exemplaire, cartes inconnues ignorées,
 *  les plus rares d'abord (versions alternatives, puis par rareté) pour qu'elles passent si la base plafonne la reprise. */
export function toImport(local: unknown): string[] {
  if (!local || typeof local !== "object") return [];
  const out: { key: string; score: number }[] = [];
  for (const [k, n] of Object.entries(local as Record<string, unknown>)) {
    const { id, variant } = splitKey(k);
    const card = BY_ID[id];
    if (!card || keyOf(id, variant) !== k || typeof n !== "number" || !Number.isInteger(n) || n <= 0) continue;
    const score = (variant ? 0 : RANK.length) + RANK.indexOf(card.rarity);
    for (let i = 0; i < Math.min(n, 500); i++) out.push({ key: k, score });
  }
  return out.sort((a, b) => a.score - b.score).map((c) => c.key);
}

/** Booster de test (en local seulement) : 2 cartes normales puis 3 en version alternative. */
export const testBooster = (rand = Math.random) =>
  Array.from({ length: BOOSTER.size }, (_, i) => keyOf(drawCard(rand).id, i < 2 ? undefined : VARIANT_IDS[(i - 2) % VARIANT_IDS.length]));

/** Visuels de boosters (public/tcg/ed1/boosters/<id>.webp) : chaque booster du carrousel en tire un au hasard. */
export const PACK_ARTS = ["boubou", "clemoune", "francois", "ines", "martin", "saro", "tardy", "viavia", "yann"];
export const packImage = (id: string) => `/tcg/ed1/boosters/${id}.webp`;
/** Hauteur de la bande à arracher (au-dessus du pointillé du visuel), en fraction de la hauteur du booster. */
export const PACK_TEAR = 0.055;
