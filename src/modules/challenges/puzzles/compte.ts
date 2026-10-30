// Le compte est bon : atteindre un nombre (101 à 999) avec 6 plaques et + − × ÷ (chaque plaque une fois au plus,
// résultats entiers et positifs). On construit le calcul étape par étape, comme à la télévision.
// Le tirage du jour a toujours au moins une solution exacte. Fonctions pures, testées dans tests/unit/puzzles.test.ts.

export const PLATES = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 25, 50, 75, 100];
export type Op = "+" | "-" | "×" | "÷";
export type Step = { a: number; op: Op; b: number }; // a et b : index dans la liste courante des nombres
export type Compte = { plates: number[]; target: number };

/** Applique une opération ; null si interdite (résultat négatif, nul ou non entier). */
export function apply(a: number, op: Op, b: number): number | null {
  if (op === "+") return a + b;
  if (op === "×") return a * b;
  if (op === "-") return a > b ? a - b : null;
  return b > 0 && a % b === 0 ? a / b : null;
}

/** Rejoue des étapes : à chaque étape, deux nombres sont remplacés par leur résultat. */
export function play(plates: number[], steps: unknown): { numbers: number[]; results: number[] } | null {
  if (!Array.isArray(steps) || steps.length > 5) return null;
  let nums = [...plates];
  const results: number[] = [];
  for (const s of steps) {
    if (!s || typeof s !== "object") return null;
    const { a, op, b } = s as Step;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b || a < 0 || b < 0 || a >= nums.length || b >= nums.length || !["+", "-", "×", "÷"].includes(op)) return null;
    const r = apply(nums[a], op, nums[b]);
    if (r === null) return null;
    nums = nums.filter((_, i) => i !== a && i !== b);
    nums.push(r);
    results.push(r);
  }
  return { numbers: nums, results };
}

/** Meilleur résultat d'un calcul : le résultat intermédiaire le plus proche de la cible (on peut s'arrêter à n'importe quelle étape). */
export function bestOf(c: Compte, steps: unknown): { value: number; distance: number; steps: number } | null {
  const r = play(c.plates, steps);
  if (!r) return null;
  const candidates = [...c.plates.map((v) => ({ v, n: 0 })), ...r.results.map((v, i) => ({ v, n: i + 1 }))];
  let best = candidates[0];
  for (const x of candidates) {
    const d = Math.abs(x.v - c.target), bd = Math.abs(best.v - c.target);
    if (d < bd || (d === bd && x.n < best.n)) best = x;
  }
  return { value: best.v, distance: Math.abs(best.v - c.target), steps: best.n };
}

/** Tous les nombres atteignables (pour vérifier qu'il existe une solution exacte). */
export function reachable(plates: number[]): Set<number> {
  const out = new Set<number>(plates);
  const seen = new Set<string>();
  const go = (nums: number[]) => {
    const k = [...nums].sort((x, y) => x - y).join(",");
    if (seen.has(k)) return;
    seen.add(k);
    for (let i = 0; i < nums.length; i++) for (let j = 0; j < nums.length; j++) {
      if (i === j) continue;
      for (const op of ["+", "-", "×", "÷"] as Op[]) {
        if ((op === "+" || op === "×") && j < i) continue;
        const r = apply(nums[i], op, nums[j]);
        if (r === null) continue;
        out.add(r);
        go([...nums.filter((_, k2) => k2 !== i && k2 !== j), r]);
      }
    }
  };
  go(plates);
  return out;
}

/** Le tirage du jour : 6 plaques (dont 1 ou 2 grandes) et une cible atteignable exactement, plutôt difficile. */
export function dailyCompte(rand: () => number): Compte {
  for (let tries = 0; tries < 50; tries++) {
    const pool = [...PLATES], plates: number[] = [];
    const big = rand() < 0.5 ? 1 : 2;
    const bigs = pool.filter((p) => p >= 25).sort(() => rand() - 0.5).slice(0, big);
    const smalls = pool.filter((p) => p <= 10).sort(() => rand() - 0.5).slice(0, 6 - big);
    plates.push(...bigs, ...smalls);
    const ok = reachable(plates);
    // On évite les cibles trop faciles : pas directement un produit ou une somme de deux plaques.
    const easy = new Set<number>();
    for (const a of plates) for (const b of plates) { easy.add(a + b); easy.add(a * b); }
    const targets = Array.from({ length: 899 }, (_, i) => 101 + i).filter((t) => ok.has(t) && !easy.has(t));
    if (targets.length) return { plates: plates.sort((a, b) => a - b), target: targets[Math.floor(rand() * targets.length)] };
  }
  throw new Error("Aucun tirage trouvé");
}
