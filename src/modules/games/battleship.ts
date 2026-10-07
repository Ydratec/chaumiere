// Bataille navale à deux : grille 8×8, flottes placées au hasard (navires qui ne se touchent pas).

import type { Base } from "./labels.ts";

export const SIZE = 8;
export const FLEET = [4, 3, 3, 2, 2];

export type Shot = { cell: number; hit: boolean };
export type BattleshipState = Base & {
  shots: Record<string, Shot[]>; // tirs effectués PAR chaque joueur
  sunk: Record<string, number[][]>; // navires coulés PAR chaque joueur
};
export type Fleets = Record<string, number[][]>; // secret : navires (cases) de chaque joueur

function near(taken: Set<number>, cell: number) {
  const r = Math.floor(cell / SIZE), c = cell % SIZE;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && taken.has(rr * SIZE + cc)) return true;
    }
  return false;
}

export function randomFleet(rand = Math.random): number[][] {
  for (;;) {
    const taken = new Set<number>();
    const ships: number[][] = [];
    for (const len of FLEET) {
      for (let tries = 0; tries < 100; tries++) {
        const horiz = rand() < 0.5;
        const r = Math.floor(rand() * (horiz ? SIZE : SIZE - len + 1));
        const c = Math.floor(rand() * (horiz ? SIZE - len + 1 : SIZE));
        const cells = Array.from({ length: len }, (_, k) => (horiz ? r * SIZE + c + k : (r + k) * SIZE + c));
        if (cells.some((x) => near(taken, x))) continue;
        cells.forEach((x) => taken.add(x));
        ships.push(cells);
        break;
      }
    }
    if (ships.length === FLEET.length) return ships;
  }
}

export function start(a: string, b: string, rand = Math.random) {
  const state: BattleshipState = { turn: rand() < 0.5 ? a : b, winner: null, shots: { [a]: [], [b]: [] }, sunk: { [a]: [], [b]: [] } };
  const secret: Fleets = { [a]: randomFleet(rand), [b]: randomFleet(rand) };
  return { state, secret };
}

/** Tir sur la case `cell` de l'adversaire. Le tour passe toujours à l'autre joueur. */
export function play(state: BattleshipState, fleets: Fleets, move: unknown, player: string): BattleshipState | null {
  const cell = Number((move as { cell?: unknown } | null)?.cell);
  const mine = state.shots[player];
  if (state.winner || state.turn !== player || !mine) return null;
  if (!Number.isInteger(cell) || cell < 0 || cell >= SIZE * SIZE || mine.some((s) => s.cell === cell)) return null;

  const opp = Object.keys(fleets).find((k) => k !== player)!;
  const ship = fleets[opp].find((s) => s.includes(cell));
  const shots = [...mine, { cell, hit: !!ship }];
  const hits = new Set(shots.filter((s) => s.hit).map((s) => s.cell));
  const sunk = ship && ship.every((c) => hits.has(c)) ? [...state.sunk[player], ship] : state.sunk[player];
  const won = fleets[opp].every((s) => s.every((c) => hits.has(c)));
  return {
    ...state,
    shots: { ...state.shots, [player]: shots },
    sunk: { ...state.sunk, [player]: sunk },
    turn: won ? player : opp,
    winner: won ? player : null,
  };
}
