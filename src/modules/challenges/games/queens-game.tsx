"use client";

import type { Person } from "@/src/modules/rooms/context";
import type { PuzzleView } from "../data";
import { QN, type Queens } from "../puzzles/queens";
import { ClientOnly, PuzzleShell, usePersist } from "../puzzle-shell";

type Mark = 0 | 1 | 2; // vide, croix, reine
type Props = { roomId: string; view: PuzzleView; me: string; people: Record<string, Person> };
const COLORS = ["#fca5a5", "#fdba74", "#fde047", "#86efac", "#67e8f9", "#93c5fd", "#c4b5fd", "#f9a8d4", "#d6d3d1"];

export function DailyQueens(props: Props) {
  return <ClientOnly><Game {...props} /></ClientOnly>;
}

function Game({ roomId, view, me, people }: Props) {
  const p = (view.data as { puzzle: Queens }).puzzle;
  const [marks, setMarks] = usePersist<Mark[]>(`defi:queens:${roomId}:${view.day}`, () => Array(QN * QN).fill(0));
  const done = view.attempt.solved;
  const queens = marks.flatMap((m, i) => (m === 2 ? [i] : []));
  // Reines en conflit : même ligne, colonne ou couleur, ou qui se touchent.
  const bad = new Set<number>();
  for (const a of queens) for (const b of queens) {
    if (a >= b) continue;
    const ax = a % QN, ay = Math.floor(a / QN), bx = b % QN, by = Math.floor(b / QN);
    if (ax === bx || ay === by || p.regions[a] === p.regions[b] || (Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1)) { bad.add(a); bad.add(b); }
  }
  const tap = (i: number) => { if (!done) setMarks((m) => m.map((v, k) => (k === i ? (((v + 1) % 3) as Mark) : v))); };
  const edge = (i: number, dx: number, dy: number) => {
    const x = (i % QN) + dx, y = Math.floor(i / QN) + dy;
    return x < 0 || y < 0 || x >= QN || y >= QN || p.regions[y * QN + x] !== p.regions[i];
  };

  return (
    <PuzzleShell roomId={roomId} kind="queens" view={view} me={me} people={people}
      rules={<>Place 9 reines : une par ligne, une par colonne et une par couleur. Deux reines ne doivent jamais se toucher, même en diagonale. Touche une case une fois pour une croix, deux fois pour une reine. Une vérification ratée ajoute 1 minute.</>}
    >
      {(submit, pending) => (
        <div className="space-y-3">
          <div className="mx-auto grid aspect-square w-full max-w-[24rem] select-none overflow-hidden rounded-xl border-2 border-zinc-800" style={{ gridTemplateColumns: `repeat(${QN}, minmax(0, 1fr))` }}>
            {marks.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => tap(i)}
                aria-label={`Case ${Math.floor(i / QN) + 1}-${(i % QN) + 1}${m === 2 ? ", reine" : m === 1 ? ", croix" : ""}`}
                className="flex aspect-square items-center justify-center text-lg"
                style={{
                  background: COLORS[p.regions[i]],
                  borderRight: edge(i, 1, 0) ? "2px solid #27272a" : "1px solid rgba(0,0,0,.08)",
                  borderBottom: edge(i, 0, 1) ? "2px solid #27272a" : "1px solid rgba(0,0,0,.08)",
                }}
              >
                {m === 2 ? <span className={bad.has(i) ? "drop-shadow-[0_0_4px_#dc2626]" : ""}>{bad.has(i) ? "❗" : "👑"}</span> : m === 1 ? <span className="text-xs text-zinc-600">✕</span> : null}
              </button>
            ))}
          </div>
          {!done && (
            <div className="flex gap-2">
              <button onClick={() => setMarks(Array(QN * QN).fill(0))} className="btn-soft px-4 text-sm">Effacer</button>
              <button disabled={pending || queens.length !== QN} onClick={() => submit(queens)} className="btn flex-1">
                {queens.length !== QN ? `${queens.length} / 9 reines` : "Vérifier mes reines"}
              </button>
            </div>
          )}
        </div>
      )}
    </PuzzleShell>
  );
}
