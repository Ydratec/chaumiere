import { describe, expect, it } from "vitest";
import { onlineStats, winnerOf, type DoneMatch } from "@/src/modules/quiz/online-stats";

const ans = (...pts: number[]) => pts.map((p, i) => ({ i, good: p > 0, pts: p }));
const duel = (id: string, a: number[], b: number[], at = "2026-11-20T10:00:00Z"): DoneMatch => ({
  id, rules: "points", n: 3, game: "flag", cat: "", created_at: at,
  players: [{ user_id: "me", answers: ans(...a), left: false }, { user_id: "lea", answers: ans(...b), left: false }],
});

describe("résultats du quiz en ligne", () => {
  it("le seul premier gagne, l'égalité en tête est un nul", () => {
    expect(winnerOf(duel("1", [20, 10], [5, 5]))).toBe("me");
    expect(winnerOf(duel("2", [10, 10], [15, 5]))).toBeNull();
  });
  it("classement, face-à-face et dernières parties", () => {
    const s = onlineStats([
      duel("1", [20, 10], [5, 5], "2026-11-20T10:00:00Z"),
      duel("2", [0, 0], [20, 20], "2026-11-21T10:00:00Z"),
      duel("3", [10], [10], "2026-11-22T10:00:00Z"),
      duel("4", [10], [], "2026-11-23T10:00:00Z"), // l'autre n'a pas joué : ne compte pas
    ], "me");
    expect(s.standings).toEqual([
      { user: "lea", played: 3, wins: 1, points: 60 },
      { user: "me", played: 3, wins: 1, points: 40 },
    ]);
    expect(s.duels).toEqual([{ user: "lea", w: 1, l: 1, d: 1 }]);
    expect(s.recent.map((r) => [r.id, r.win, r.draw])).toEqual([["3", false, true], ["2", false, false], ["1", true, false]]);
  });
});
