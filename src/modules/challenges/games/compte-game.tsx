"use client";

import { useState } from "react";
import type { Person } from "@/src/modules/rooms/context";
import type { PuzzleView } from "../data";
import { apply, bestOf, play, type Compte, type Op, type Step } from "../puzzles/compte";
import { ClientOnly, PuzzleShell, usePersist } from "../puzzle-shell";

type Props = { roomId: string; view: PuzzleView; me: string; people: Record<string, Person> };
const OPS: Op[] = ["+", "-", "×", "÷"];

export function DailyCompte(props: Props) {
  return <ClientOnly><Game {...props} /></ClientOnly>;
}

function Game({ roomId, view, me, people }: Props) {
  const c = (view.data as { puzzle: Compte }).puzzle;
  const [steps, setSteps] = usePersist<Step[]>(`defi:compte:${roomId}:${view.day}`, () => []);
  const [pick, setPick] = useState<{ a: number | null; op: Op | null }>({ a: null, op: null });
  const [warn, setWarn] = useState("");
  const state = play(c.plates, steps) ?? { numbers: c.plates, results: [] };
  const best = bestOf(c, steps);
  const nums = state.numbers;
  // Les plaques de départ restent dans l'ordre ; les résultats s'ajoutent à la fin (en couleur).
  const made = steps.reduce((m, st) => [...m.filter((_, i) => i !== st.a && i !== st.b), true], c.plates.map(() => false));

  const tapNum = (i: number) => {
    setWarn("");
    if (pick.a === null || pick.op === null) return setPick({ a: pick.a === i ? null : i, op: null });
    if (pick.a === i) return setPick({ a: null, op: null });
    const r = apply(nums[pick.a], pick.op, nums[i]);
    if (r === null) { setWarn(pick.op === "-" ? "Le résultat doit rester positif." : "La division doit tomber juste."); return; }
    if (steps.length >= 5) return;
    setSteps([...steps, { a: pick.a, op: pick.op, b: i }]);
    setPick({ a: null, op: null });
  };

  return (
    <PuzzleShell roomId={roomId} kind="compte" view={view} me={me} people={people}
      rules={<>Combine les plaques deux par deux (+ − × ÷) pour t&apos;approcher le plus possible du nombre. Chaque plaque sert une fois au plus ; les résultats restent entiers et positifs. Tu peux proposer autant de calculs que tu veux : ton meilleur compte. Il existe toujours une solution exacte.</>}
    >
      {(submit, pending) => (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-800 py-4 text-center text-white">
            <span className="block text-xs font-semibold uppercase tracking-wider text-white/60">À trouver</span>
            <span className="text-5xl font-bold tabular-nums tracking-tight">{c.target}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {nums.map((n, i) => (
              <button key={`${i}-${n}`} type="button" onClick={() => tapNum(i)}
                className={`rounded-2xl py-3 text-2xl font-bold tabular-nums shadow-sm transition ${pick.a === i ? "bg-indigo-600 text-white" : made[i] ? "bg-amber-100 text-amber-900" : "bg-white"}`}>
                {n}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {OPS.map((op) => (
              <button key={op} type="button" disabled={pick.a === null} onClick={() => setPick({ ...pick, op })}
                className={`rounded-2xl py-3 text-2xl font-bold shadow-sm disabled:opacity-40 ${pick.op === op ? "bg-indigo-600 text-white" : "bg-white"}`}>
                {op}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-zinc-500">{pick.a === null ? "Touche un nombre…" : pick.op === null ? "…puis une opération…" : "…puis un autre nombre."}</p>
          {warn && <p className="text-center text-sm text-amber-700">{warn}</p>}

          {steps.length > 0 && (
            <ol className="space-y-1 rounded-2xl bg-white p-3 text-sm tabular-nums shadow-sm">
              {steps.map((s, k) => {
                const before = play(c.plates, steps.slice(0, k))!.numbers;
                return <li key={k}>{before[s.a]} {s.op} {before[s.b]} = <b>{state.results[k]}</b></li>;
              })}
            </ol>
          )}

          <div className="flex gap-2">
            <button disabled={!steps.length} onClick={() => { setSteps(steps.slice(0, -1)); setPick({ a: null, op: null }); }} className="btn-soft px-4 text-sm">Annuler</button>
            <button disabled={!steps.length} onClick={() => { setSteps([]); setPick({ a: null, op: null }); }} className="btn-soft px-4 text-sm">Recommencer</button>
            <button disabled={pending || !best || !steps.length} onClick={() => submit(steps)} className="btn flex-1">
              {best && best.distance === 0 ? "Le compte est bon !" : best ? `Valider (à ${best.distance} près)` : "Valider"}
            </button>
          </div>
        </div>
      )}
    </PuzzleShell>
  );
}
