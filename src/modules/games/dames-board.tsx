"use client";

import { useState } from "react";
import { isDark, legalMoves, N, type DamesState, type Move } from "./dames";
import type { BoardProps } from "./labels";

/** Couronne d'une dame. */
const Crown = ({ dark }: { dark: boolean }) => (
  <svg viewBox="0 0 24 16" className="w-[55%]" aria-hidden>
    <path d="M2 14V4l5 4 5-7 5 7 5-4v10z" fill={dark ? "#f5c542" : "#d9a520"} stroke={dark ? "#d9a520" : "#a8780f"} strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

/**
 * Damier 10 × 10, vu de son côté (ses pièces en bas). On touche une pièce, puis la case d'arrivée ;
 * pour une rafle, on touche chaque case où l'on se pose. Les prises obligatoires sont signalées.
 */
export function DamesBoard({ state, userId, myTurn, name, play }: BoardProps) {
  const s = state as unknown as DamesState;
  const players = Object.keys(s.colors);
  const mine = s.colors[userId] ?? "w";
  const flip = mine === "b"; // les noirs voient le plateau retourné
  const [path, setPath] = useState<number[]>([]);
  const [sending, setSending] = useState(false);

  const moves: Move[] = myTurn ? legalMoves(s.board, mine) : [];
  const prefixed = moves.filter((m) => path.every((x, i) => m.path[i] === x));
  const startable = new Set(moves.map((m) => m.path[0]));
  const next = new Set(path.length ? prefixed.map((m) => m.path[path.length]).filter((x) => x !== undefined) : []);
  const pending = new Set(prefixed.length && path.length > 1 ? prefixed[0].captured.slice(0, path.length - 1) : []); // pièces déjà sautées dans la rafle en cours
  const mustTake = moves.length > 0 && moves[0].captured.length > 0;

  async function tap(i: number) {
    if (!myTurn || sending) return;
    if (startable.has(i) && (path.length <= 1)) return setPath(path[0] === i ? [] : [i]);
    if (!next.has(i)) return;
    const p = [...path, i];
    const done = moves.find((m) => m.path.length === p.length && m.path.every((x, k) => x === p[k]));
    if (!done) return setPath(p);
    setSending(true);
    await play({ path: p });
    setSending(false);
    setPath([]);
  }

  const count = (color: "w" | "b") => s.board.filter((p) => p.toLowerCase() === color).length;
  const order = Array.from({ length: N * N }, (_, k) => (flip ? N * N - 1 - k : k));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {players.map((p) => (
          <div key={p} className={`flex items-center gap-3 rounded-2xl px-4 py-2 transition ${s.turn === p && !s.winner ? "bg-indigo-600 text-white" : "bg-white text-zinc-600 shadow-sm"}`}>
            <span className={`size-6 shrink-0 rounded-full ring-2 ${s.colors[p] === "w" ? "bg-[#f6ead3] ring-[#c9b28a]" : "bg-[#3b2a20] ring-[#1f1510]"}`} />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium opacity-80">{name(p)}</p>
              <p className="text-lg font-bold tabular-nums leading-tight">{count(s.colors[p])} <span className="text-xs font-medium opacity-70">pièces</span></p>
            </div>
          </div>
        ))}
      </div>

      {myTurn && mustTake && <p className="rounded-2xl bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800">Prise obligatoire{moves[0].captured.length > 1 ? ` : rafle de ${moves[0].captured.length} pièces` : ""} !</p>}

      <div className="grid aspect-square grid-cols-10 overflow-hidden rounded-2xl shadow-[0_18px_40px_-24px_rgb(0_0_0/0.45)] ring-4 ring-[#7a5131]">
        {order.map((i) => {
          const dark = isDark(i);
          const p = s.board[i];
          const last = s.last?.includes(i);
          const chosen = path.includes(i);
          const target = next.has(i);
          const canStart = myTurn && !path.length && startable.has(i);
          return (
            <button
              key={i}
              type="button"
              disabled={!dark || !myTurn}
              onClick={() => tap(i)}
              aria-label={dark ? `Case ${i}${p ? `, ${p.toLowerCase() === "w" ? "blanc" : "noir"}${p === p.toUpperCase() ? " (dame)" : ""}` : ""}` : undefined}
              className={`relative flex aspect-square items-center justify-center ${dark ? (last ? "bg-[#8f6a3a]" : "bg-[#a77b4f]") : "bg-[#efd9ba]"} ${chosen ? "ring-2 ring-inset ring-indigo-400" : ""}`}
            >
              {p && (
                <span
                  className={`flex size-[78%] items-center justify-center rounded-full shadow-[inset_0_-3px_0_rgb(0_0_0/0.25),0_2px_3px_rgb(0_0_0/0.35)] transition ${
                    p.toLowerCase() === "w" ? "bg-[#f6ead3]" : "bg-[#3b2a20]"
                  } ${pending.has(i) ? "opacity-30" : ""} ${canStart ? (mustTake ? "animate-pulse ring-2 ring-amber-400" : "ring-2 ring-white/70") : ""} ${path[0] === i ? "scale-110 ring-2 ring-indigo-400" : ""}`}
                >
                  {p === p.toUpperCase() && <Crown dark={p === "B"} />}
                </span>
              )}
              {target && <span className="absolute size-[34%] rounded-full bg-indigo-400/80 ring-2 ring-white" />}
            </button>
          );
        })}
      </div>

      {myTurn && (
        <p className="text-center text-xs text-zinc-500">
          {path.length ? (path.length > 1 ? "Continue la rafle : touche la case suivante." : "Touche la case d'arrivée.") : "Touche une de tes pièces."}
          {path.length > 0 && <button onClick={() => setPath([])} className="ml-2 font-semibold text-indigo-600">Annuler</button>}
        </p>
      )}
    </div>
  );
}
