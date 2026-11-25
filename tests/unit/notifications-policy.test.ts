import { describe, expect, it } from "vitest";
import { roomAllowed, type Sent } from "@/src/modules/notifications/policy";

const MIN = 60_000, now = Date.parse("2026-11-25T14:00:00Z");
const sent = (minAgo: number, topic = "games", sender: string | null = "lea"): Sent => ({ topic, sender, at: now - minAgo * MIN });

describe("anti-spam des notifications", () => {
  it("une seule notification « salle » par personne qui envoie, toutes les 30 min", () => {
    expect(roomAllowed({ sent: [sent(10)], seen: 0, now, topic: "games", sender: "lea" })).toBe(false);
    expect(roomAllowed({ sent: [sent(10)], seen: 0, now, topic: "games", sender: "hugo" })).toBe(true);
    expect(roomAllowed({ sent: [sent(40)], seen: 0, now, topic: "games", sender: "lea" })).toBe(true);
  });
  it("une seule invitation au quiz tant qu'on n'est pas revenu", () => {
    const s = [sent(300, "quiz", "hugo")];
    expect(roomAllowed({ sent: s, seen: 0, now, topic: "quiz", sender: "lea" })).toBe(false);
    expect(roomAllowed({ sent: s, seen: now - 200 * MIN, now, topic: "quiz", sender: "lea" })).toBe(true); // revenu depuis
  });
  it("4 par heure et 12 par jour, compteurs remis à zéro par une visite", () => {
    const hour = [1, 2, 3, 4].map((m) => sent(m, "games", `u${m}`));
    expect(roomAllowed({ sent: hour, seen: 0, now, topic: "games", sender: "x" })).toBe(false);
    expect(roomAllowed({ sent: hour, seen: now - 2.5 * MIN, now, topic: "games", sender: "x" })).toBe(true);
    const day = Array.from({ length: 12 }, (_, k) => sent(70 + k * 60, "games", `u${k}`));
    expect(roomAllowed({ sent: day, seen: 0, now, topic: "games", sender: "x" })).toBe(false);
  });
});
