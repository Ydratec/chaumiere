"use client";

import { Cat } from "@/src/components/cat";
import type { BoardProps } from "./labels";
import type { MemoryState } from "./memory";

export function MemoryBoard({ state, myTurn, name, play }: BoardProps) {
  const s = state as unknown as MemoryState;
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {Object.keys(s.scores).map((p) => (
          <div key={p} className={`rounded-2xl px-4 py-2 transition ${s.turn === p && !s.winner ? "bg-indigo-600 text-white" : "bg-white text-zinc-600 shadow-sm"}`}>
            <p className="text-xs font-medium opacity-80">{name(p)}</p>
            <p className="text-2xl font-bold tabular-nums">{s.scores[p]}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {s.cards.map((c, i) => (
          <button
            key={i}
            disabled={!myTurn || s.matched[i]}
            onClick={() => play({ i })}
            aria-label={c ? `Chat ${c}` : "Carte cachée"}
            className={`flex aspect-square items-center justify-center rounded-2xl transition ${
              s.matched[i] ? "bg-white/60" : c ? "animate-pop bg-white shadow-md ring-2 ring-indigo-400" : "bg-indigo-600 shadow-sm hover:bg-indigo-500"
            }`}
          >
            {c && <Cat coat={Number(c)} mood={s.matched[i] ? "laugh" : "happy"} size={44} />}
          </button>
        ))}
      </div>
    </>
  );
}
