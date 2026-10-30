"use client";

import { useState } from "react";
import type { Person } from "@/src/modules/rooms/context";
import type { PuzzleView } from "../data";
import { HN, edgesOf, type Hashi } from "../puzzles/hashi";
import { ClientOnly, PuzzleShell, usePersist } from "../puzzle-shell";

type Props = { roomId: string; view: PuzzleView; me: string; people: Record<string, Person> };

export function DailyHashi(props: Props) {
  return <ClientOnly><Game {...props} /></ClientOnly>;
}

function Game({ roomId, view, me, people }: Props) {
  const p = (view.data as { puzzle: Hashi }).puzzle;
  const E = edgesOf(p.islands);
  const [count, setCount] = usePersist<number[]>(`defi:hashi:${roomId}:${view.day}`, () => Array(E.length).fill(0));
  const [sel, setSel] = useState<number | null>(null);
  const [warn, setWarn] = useState("");
  const done = view.attempt.solved;
  const deg = p.islands.map((_, i) => E.reduce((s, e, k) => s + (e.a === i || e.b === i ? count[k] : 0), 0));
  const crossing = (k: number, j: number) => {
    const e = E[k], f = E[j];
    if (e.h === f.h) return false;
    const [h, v] = e.h ? [e, f] : [f, e];
    return v.lo < h.at && h.at < v.hi && h.lo < v.at && v.at < h.hi;
  };

  const tap = (i: number) => {
    if (done) return;
    setWarn("");
    if (sel === null || sel === i) return setSel(sel === i ? null : i);
    const k = E.findIndex((e) => (e.a === sel && e.b === i) || (e.a === i && e.b === sel));
    if (k < 0) { setSel(i); return; }
    const next = (count[k] + 1) % 3;
    if (next > 0 && E.some((_, j) => count[j] > 0 && crossing(k, j))) { setWarn("Ce pont croiserait un autre pont."); return; }
    setCount((c) => c.map((v, j) => (j === k ? next : v)));
    setSel(null);
  };

  const S = 100 / HN, c = (v: number) => (v + 0.5) * S;
  return (
    <PuzzleShell roomId={roomId} kind="hashi" view={view} me={me} people={people}
      rules={<>Chaque île doit avoir exactement son nombre de ponts. Les ponts sont droits, jamais croisés, au plus 2 entre deux îles, et toutes les îles finissent reliées entre elles. Touche une île puis une autre pour poser un pont (une deuxième fois : pont double, une troisième : plus de pont). Une vérification ratée ajoute 1 minute.</>}
    >
      {(submit, pending) => (
        <div className="space-y-3">
          <div className="relative mx-auto aspect-square w-full max-w-[24rem] select-none rounded-2xl bg-sky-100">
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
              {Array.from({ length: HN }, (_, k) => <g key={k}><path d={`M${c(k)} 0V100`} stroke="#bae6fd" strokeWidth=".3" /><path d={`M0 ${c(k)}H100`} stroke="#bae6fd" strokeWidth=".3" /></g>)}
              {E.map((e, k) => {
                if (!count[k]) return null;
                const A = p.islands[e.a], B = p.islands[e.b];
                const off = count[k] === 2 ? 1.1 : 0;
                const line = (o: number) => <path key={o} d={`M${c(A.x) + (e.h ? 0 : o)} ${c(A.y) + (e.h ? o : 0)}L${c(B.x) + (e.h ? 0 : o)} ${c(B.y) + (e.h ? o : 0)}`} stroke="#7a5131" strokeWidth="1.1" strokeLinecap="round" />;
                return <g key={k}>{count[k] === 2 ? [line(-off), line(off)] : line(0)}</g>;
              })}
            </svg>
            {p.islands.map((s, i) => {
              const state = deg[i] === s.n ? "ok" : deg[i] > s.n ? "over" : "";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => tap(i)}
                  aria-label={`Île ${s.n}, ${deg[i]} pont${deg[i] > 1 ? "s" : ""}`}
                  className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm transition ${sel === i ? "scale-110 border-indigo-600 bg-indigo-100" : state === "ok" ? "border-green-600 bg-green-100 text-green-800" : state === "over" ? "border-red-500 bg-red-100 text-red-700" : "border-amber-700 bg-amber-50 text-zinc-800"}`}
                  style={{ left: `${c(s.x)}%`, top: `${c(s.y)}%`, width: `${S * 0.82}%`, height: `${S * 0.82}%` }}
                >
                  {s.n}
                </button>
              );
            })}
          </div>
          {warn && <p className="text-center text-sm text-amber-700">{warn}</p>}
          {!done && (
            <div className="flex gap-2">
              <button onClick={() => { setCount(Array(E.length).fill(0)); setSel(null); }} className="btn-soft px-4 text-sm">Effacer</button>
              <button disabled={pending || deg.some((d, i) => d !== p.islands[i].n)} onClick={() => submit(E.flatMap((e, k) => (count[k] ? [{ a: e.a, b: e.b, n: count[k] }] : [])))} className="btn flex-1">
                {deg.some((d, i) => d !== p.islands[i].n) ? "Complète toutes les îles" : "Vérifier mes ponts"}
              </button>
            </div>
          )}
        </div>
      )}
    </PuzzleShell>
  );
}
