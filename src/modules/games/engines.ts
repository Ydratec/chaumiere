// Branche chaque type de jeu sur ses règles. Utilisé côté serveur (les secrets ne sortent pas d'ici).
import * as battleship from "./battleship";
import type { Base, GameType } from "./labels";
import * as memory from "./memory";
import * as orapa from "./orapa";

type Engine = {
  start(a: string, b: string): { state: Base; secret: unknown };
  /** Nouvel état, et éventuellement une part du secret à fusionner (objet). null = coup refusé. */
  play(state: unknown, secret: unknown, move: unknown, player: string): { state: Base; secretPatch?: Record<string, unknown> } | null;
  view?(secret: unknown, player: string): unknown; // ce que ce joueur a le droit de voir du secret
  reveal?(state: unknown, secret: unknown): Base; // état final montré quand la partie s'arrête avant la fin
};

const wrap = (state: Base | null) => (state ? { state } : null);

export const ENGINES: Record<GameType, Engine> = {
  memory: {
    start: (a, b) => {
      const { deck, state } = memory.newGame(a, b);
      return { state, secret: deck };
    },
    play: (s, deck, m, p) =>
      wrap(memory.flip(s as memory.MemoryState, deck as string[], Number((m as { i?: unknown } | null)?.i), p)),
  },
  battleship: {
    start: (a, b) => battleship.start(a, b),
    play: (s, fleets, m, p) => wrap(battleship.play(s as battleship.BattleshipState, fleets as battleship.Fleets, m, p)),
    view: (fleets, p) => (fleets as battleship.Fleets)[p] ?? null,
  },
  orapa: {
    start: (a, b) => orapa.start(a, b),
    // Les anciennes parties (une seule grille tirée au hasard) ne sont plus jouables.
    play: (s, secrets, m, p) => (Array.isArray(secrets) ? null : orapa.play(s as orapa.OrapaState, secrets as orapa.Secrets, m, p)),
    view: (secrets, p) => (Array.isArray(secrets) ? null : (secrets as orapa.Secrets)[p] ?? null),
    reveal: (s, secrets) => ({ ...(s as orapa.OrapaState), solutions: Array.isArray(secrets) ? null : (secrets as orapa.Secrets) }),
  },
};
