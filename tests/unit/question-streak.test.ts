import { describe, expect, it } from "vitest";
import { loadStreak } from "@/src/modules/questions/streak";

// Faux client Supabase : rend les questions (daily_activities) et les réponses (answers) données.
function fake(days: Record<string, string[]>) {
  const acts = Object.keys(days).map((day) => ({ id: `q-${day}`, day }));
  const answers = Object.entries(days).flatMap(([day, users]) => users.map((u) => ({ activity_id: `q-${day}`, user_id: u })));
  const chain = (data: unknown) => {
    const c: Record<string, unknown> = { then: (f: (r: { data: unknown }) => unknown) => Promise.resolve({ data }).then(f) };
    for (const k of ["select", "eq", "gte", "lte", "in"]) c[k] = () => c;
    return c;
  };
  return { from: (t: string) => chain(t === "answers" ? answers : acts) } as never;
}

const ALL = ["a", "b", "c"];

describe("flamme de la salle", () => {
  it("compte les jours d'affilée où tout le monde a répondu, aujourd'hui compris", async () => {
    const r = await loadStreak(fake({ "2026-11-25": ALL, "2026-11-24": ALL, "2026-11-23": ALL, "2026-11-22": ["a"] }), "r", ALL, "2026-11-25");
    expect(r).toEqual({ days: 3, answered: 3, total: 3, today: true });
  });
  it("garde la série d'hier tant qu'aujourd'hui n'est pas fini", async () => {
    const r = await loadStreak(fake({ "2026-11-25": ["a"], "2026-11-24": ALL, "2026-11-23": ALL }), "r", ALL, "2026-11-25");
    expect(r).toEqual({ days: 2, answered: 1, total: 3, today: false });
  });
  it("un jour sans question casse la série", async () => {
    const r = await loadStreak(fake({ "2026-11-25": ALL, "2026-11-23": ALL }), "r", ALL, "2026-11-25");
    expect(r.days).toBe(1);
  });
  it("zéro quand hier n'était pas complet", async () => {
    const r = await loadStreak(fake({ "2026-11-25": ["a", "b"], "2026-11-24": ["a", "b"] }), "r", ALL, "2026-11-25");
    expect(r.days).toBe(0);
  });
});
