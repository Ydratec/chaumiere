"use client";

import { useRef, useState } from "react";
import type { Person } from "@/src/modules/rooms/context";
import type { PuzzleView } from "../data";
import { PX, cluesOf, type Picross } from "../puzzles/picross";
import { ClientOnly, PuzzleShell, usePersist } from "../puzzle-shell";

type Cell = 0 | 1 | 2; // vide, noire, croix
type Props = { roomId: string; view: PuzzleView; me: string; people: Record<string, Person> };

export function DailyPicross(props: Props) {
  return <ClientOnly><Game {...props} /></ClientOnly>;
}

function Game({ roomId, view, me, people }: Props) {
  const p = (view.data as { puzzle: Picross }).puzzle;
  const [grid, setGrid] = usePersist<Cell[]>(`defi:picross:${roomId}:${view.day}`, () => Array(PX * PX).fill(0));
  const [tool, setTool] = useState<1 | 2>(1);
  const paint = useRef<{ to: Cell } | null>(null);
  const done = view.attempt.solved;

  const set = (i: number, v: Cell) => setGrid((g) => (g[i] === v ? g : g.map((c, k) => (k === i ? v : c))));
  const down = (i: number) => {
    if (done) return;
    const to: Cell = grid[i] === tool ? 0 : tool;
    paint.current = { to };
    set(i, to);
  };
  const enter = (i: number) => { if (paint.current) set(i, paint.current.to); };
  const cellAt = (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const i = el?.dataset.cell;
    return i === undefined ? null : Number(i);
  };

  const line = (y: number) => grid.slice(y * PX, y * PX + PX).map((c) => c === 1);
  const col = (x: number) => Array.from({ length: PX }, (_, y) => grid[y * PX + x] === 1);
  const rowOk = (y: number) => cluesOf(line(y)).join() === p.rows[y].join();
  const colOk = (x: number) => cluesOf(col(x)).join() === p.cols[x].join();
  const maxCol = Math.max(...p.cols.map((c) => c.length)), maxRow = Math.max(...p.rows.map((r) => r.length));

  return (
    <PuzzleShell roomId={roomId} kind="picross" view={view} me={me} people={people}
      rules={<>Les nombres donnent, dans l&apos;ordre, la longueur des blocs de cases noires de chaque ligne et de chaque colonne (séparés par au moins une case blanche). Pose des croix sur les cases que tu sais blanches. Tout se déduit, sans jamais deviner. Une vérification ratée ajoute 1 minute.</>}
    >
      {(submit, pending) => (
        <div className="space-y-3">
          {/* La grille prend toute la largeur disponible : les cases rétrécissent, rien ne dépasse, même sur un petit écran. */}
          <div className="w-full">
            <div
              className="mx-auto grid w-full max-w-[26rem] select-none touch-none"
              style={{ gridTemplateColumns: `max-content repeat(${PX}, minmax(0, 1fr))` }}
              onPointerMove={(e) => { if (paint.current) { const i = cellAt(e); if (i !== null) enter(i); } }}
              onPointerUp={() => (paint.current = null)}
              onPointerLeave={() => (paint.current = null)}
            >
              <span />
              {p.cols.map((c, x) => (
                <span key={x} className={`flex flex-col items-center justify-end pb-0.5 text-[clamp(7px,2.4vw,10px)] font-semibold leading-[1.15] tabular-nums ${colOk(x) ? "text-zinc-300" : "text-zinc-700"} ${x % 5 === 0 ? "border-l border-zinc-400" : ""}`} style={{ minHeight: `${maxCol * 1.15 + 0.3}em` }}>
                  {c.map((n, k) => <span key={k}>{n}</span>)}
                </span>
              ))}
              {Array.from({ length: PX }, (_, y) => (
                <Row key={y} y={y} clue={p.rows[y]} ok={rowOk(y)} width={maxRow} grid={grid} down={down} />
              ))}
            </div>
          </div>
          {!done && (
            <div className="flex gap-2">
              <div className="grid flex-1 grid-cols-2 gap-1 rounded-full bg-zinc-100 p-1 text-sm font-medium">
                <button onClick={() => setTool(1)} className={`rounded-full py-2 ${tool === 1 ? "bg-white shadow-sm" : "text-zinc-500"}`}>■ Noircir</button>
                <button onClick={() => setTool(2)} className={`rounded-full py-2 ${tool === 2 ? "bg-white shadow-sm" : "text-zinc-500"}`}>✕ Croix</button>
              </div>
              <button onClick={() => setGrid(Array(PX * PX).fill(0))} className="btn-soft px-3 text-sm">Effacer</button>
            </div>
          )}
          {!done && <button disabled={pending} onClick={() => submit(grid.map((c) => c === 1))} className="btn w-full">Vérifier ma grille</button>}
        </div>
      )}
    </PuzzleShell>
  );
}

function Row({ y, clue, ok, width, grid, down }: { y: number; clue: number[]; ok: boolean; width: number; grid: Cell[]; down: (i: number) => void }) {
  return (
    <>
      <span className={`flex items-center justify-end gap-[0.3em] pr-1 text-[clamp(7px,2.4vw,10px)] font-semibold tabular-nums ${ok ? "text-zinc-300" : "text-zinc-700"} ${y % 5 === 0 ? "border-t border-zinc-400" : ""}`} style={{ minWidth: `${width * 1.1}em` }}>
        {clue.map((n, k) => <span key={k}>{n}</span>)}
      </span>
      {Array.from({ length: PX }, (_, x) => {
        const i = y * PX + x, c = grid[i];
        return (
          <span
            key={x}
            data-cell={i}
            onPointerDown={(e) => { try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {} down(i); }}
            className={`flex aspect-square min-w-0 items-center justify-center border-b border-r border-zinc-200 text-[clamp(7px,2.6vw,11px)] text-zinc-400 ${c === 1 ? "bg-zinc-800" : "bg-white"} ${x % 5 === 0 ? "border-l border-l-zinc-400" : ""} ${y % 5 === 0 ? "border-t border-t-zinc-400" : ""} ${x === PX - 1 ? "border-r-zinc-400" : ""} ${y === PX - 1 ? "border-b-zinc-400" : ""}`}
          >
            {c === 2 ? "✕" : ""}
          </span>
        );
      })}
    </>
  );
}
