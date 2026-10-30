"use client";

import { useRef, useState } from "react";
import type { Person } from "@/src/modules/rooms/context";
import type { PuzzleView } from "../data";
import { EXIT_ROW, RN, moved, reach, solved, type Car, type Move, type Rush } from "../puzzles/rush";
import { ClientOnly, PuzzleShell, usePersist } from "../puzzle-shell";

type Props = { roomId: string; view: PuzzleView; me: string; people: Record<string, Person> };
const WOOD = ["#c98b62", "#a3c47a", "#7fb2d6", "#d6a85c", "#b49ad6", "#8fc7b4", "#d68f8f", "#c4b28a"];

export function DailyRush(props: Props) {
  return <ClientOnly><Game {...props} /></ClientOnly>;
}

function Game({ roomId, view, me, people }: Props) {
  const data = view.data as { puzzle: Rush; min: number };
  const [moves, setMoves] = usePersist<Move[]>(`defi:rush:${roomId}:${view.day}`, () => []);
  const cars = moves.reduce<Car[]>((cs, m) => moved(cs, m), data.puzzle.cars);
  const out = solved(cars);
  const board = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ car: number; start: number; from: number; lo: number; hi: number; at: number } | null>(null);
  const [sent, setSent] = useState(false);

  const down = (i: number, e: React.PointerEvent) => {
    if (out) return;
    const c = cars[i], r = reach(cars, i), here = c.h ? c.x : c.y;
    const lo = Math.min(here, ...r), hi = Math.max(here, ...r);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ car: i, start: c.h ? e.clientX : e.clientY, from: here, lo, hi, at: here });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag || !board.current) return;
    const cell = board.current.clientWidth / RN, c = cars[drag.car];
    const d = ((c.h ? e.clientX : e.clientY) - drag.start) / cell;
    setDrag({ ...drag, at: Math.max(drag.lo, Math.min(drag.hi, drag.from + d)) });
  };
  const up = () => {
    if (!drag) return;
    const to = Math.round(drag.at);
    if (to !== drag.from) setMoves([...moves, { car: drag.car, to }]);
    setDrag(null);
  };

  return (
    <PuzzleShell roomId={roomId} kind="rush" view={view} me={me} people={people}
      rules={<>Fais glisser les charrettes et les brouettes dans leur sens (en long, jamais de côté) pour libérer le passage : la charrette rouge doit sortir par la porte à droite. Chaque glissement compte 1 coup, quelle que soit la distance. Le minimum possible aujourd&apos;hui : <b>{data.min} coups</b>. Tu peux recommencer autant que tu veux : ton meilleur résultat compte.</>}
    >
      {(submit, pending) => (
        <div className="space-y-3">
          <p className="flex justify-between text-sm font-medium"><span>Coups : <b className="tabular-nums">{moves.length}</b></span><span className="text-zinc-500">minimum : {data.min}</span></p>
          <div className="relative mx-auto w-full max-w-[22rem]">
            <div ref={board} className="relative aspect-square w-full touch-none select-none rounded-2xl bg-[#e9d9b8] shadow-inner" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
              {/* pavés */}
              <svg viewBox={`0 0 ${RN} ${RN}`} className="absolute inset-0 size-full" aria-hidden>
                {Array.from({ length: RN * RN }, (_, k) => <rect key={k} x={(k % RN) + 0.04} y={Math.floor(k / RN) + 0.04} width=".92" height=".92" rx=".12" fill={(k + Math.floor(k / RN)) % 2 ? "#e2cfa9" : "#ddc8a0"} />)}
              </svg>
              {/* porte de sortie */}
              <span className="absolute -right-3 flex w-3 items-center justify-center rounded-r-md bg-green-600 text-[10px] text-white" style={{ top: `${(EXIT_ROW / RN) * 100}%`, height: `${100 / RN}%` }}>→</span>
              {cars.map((c, i) => {
                const pos = drag?.car === i ? drag.at : c.h ? c.x : c.y;
                const x = c.h ? pos : c.x, y = c.h ? c.y : pos;
                return (
                  <button
                    key={i}
                    type="button"
                    onPointerDown={(e) => down(i, e)}
                    aria-label={i === 0 ? "Charrette rouge" : `Véhicule ${i}`}
                    className={`absolute flex items-center justify-center rounded-xl border-2 shadow-md ${drag?.car === i ? "z-10 scale-[1.03]" : "transition-[left,top] duration-150"}`}
                    style={{
                      left: `${(x / RN) * 100 + 0.8}%`, top: `${(y / RN) * 100 + 0.8}%`,
                      width: `${((c.h ? c.len : 1) / RN) * 100 - 1.6}%`, height: `${((c.h ? 1 : c.len) / RN) * 100 - 1.6}%`,
                      background: i === 0 ? "#dc2626" : WOOD[i % WOOD.length], borderColor: i === 0 ? "#991b1b" : "rgba(0,0,0,.18)",
                    }}
                  >
                    <span className="text-lg" aria-hidden>{i === 0 ? "🧺" : c.len === 3 ? "🪵" : "📦"}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {out ? (
            <button disabled={pending || sent} onClick={() => { setSent(true); submit(moves); }} className="btn w-full">
              {sent ? "Enregistré" : `Sortie en ${moves.length} coups : enregistrer`}
            </button>
          ) : (
            <div className="flex gap-2">
              <button disabled={!moves.length} onClick={() => setMoves(moves.slice(0, -1))} className="btn-soft flex-1 text-sm">Annuler le coup</button>
              <button disabled={!moves.length} onClick={() => setMoves([])} className="btn-soft flex-1 text-sm">Recommencer</button>
            </div>
          )}
          {out && <button onClick={() => { setMoves([]); setSent(false); }} className="btn-soft w-full text-sm">Rejouer pour faire mieux</button>}
        </div>
      )}
    </PuzzleShell>
  );
}
