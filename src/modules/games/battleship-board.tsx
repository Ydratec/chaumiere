"use client";

import { FLEET, SIZE, type BattleshipState, type Shot } from "./battleship";
import type { BoardProps } from "./labels";

/** Une grille 8×8 : tirs reçus, navires coulés, et éventuellement sa propre flotte. */
function Grid({ shots, sunk, fleet, onShoot }: { shots: Shot[]; sunk: number[][]; fleet?: number[][] | null; onShoot?: (cell: number) => void }) {
  const shot = new Map(shots.map((s) => [s.cell, s.hit]));
  const sunkCells = new Set(sunk.flat());
  const ships = new Set((fleet ?? []).flat());
  return (
    <div className="grid grid-cols-8 gap-[3px] rounded-2xl bg-sky-100 p-1.5">
      {Array.from({ length: SIZE * SIZE }, (_, i) => {
        const hit = shot.get(i);
        const bg = sunkCells.has(i) ? "bg-slate-800" : hit ? "bg-red-500" : ships.has(i) ? "bg-slate-400" : "bg-white/80";
        return (
          <button
            key={i}
            disabled={!onShoot || hit !== undefined}
            onClick={() => onShoot?.(i)}
            aria-label={`Case ${"ABCDEFGH"[Math.floor(i / SIZE)]}${(i % SIZE) + 1}`}
            className={`flex aspect-square items-center justify-center rounded-md transition ${bg} ${onShoot && hit === undefined ? "hover:bg-indigo-50" : ""}`}
          >
            {hit === false && <span className="size-1.5 rounded-full bg-zinc-400" />}
            {hit && !sunkCells.has(i) && <span className="size-2 rounded-full bg-white" />}
          </button>
        );
      })}
    </div>
  );
}

export function BattleshipBoard({ state, userId, myTurn, name, play, priv }: BoardProps) {
  const s = state as unknown as BattleshipState;
  const players = Object.keys(s.shots);
  const player = players.includes(userId);
  const me = player ? userId : players[0];
  const opp = players.find((p) => p !== me)!;
  const count = (p: string) => `${s.sunk[p].length}/${FLEET.length} coulés`;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 flex items-baseline justify-between">
          <span className="eyebrow">{player ? `Chez ${name(opp)}` : `Tirs de ${name(me)}`}</span>
          <span className="text-xs text-zinc-500">{count(me)}</span>
        </p>
        <Grid shots={s.shots[me]} sunk={s.sunk[me]} onShoot={myTurn ? (cell) => play({ cell }) : undefined} />
      </div>
      <div className="mx-auto w-3/4">
        <p className="mb-2 flex items-baseline justify-between">
          <span className="eyebrow">{player ? "Ta flotte" : `Tirs de ${name(opp)}`}</span>
          <span className="text-xs text-zinc-500">{count(opp)}</span>
        </p>
        <Grid shots={s.shots[opp]} sunk={s.sunk[opp]} fleet={player ? (priv as number[][] | null) : null} />
      </div>
    </div>
  );
}
