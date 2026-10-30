"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Person } from "@/src/modules/rooms/context";
import { codeGuess } from "./actions";
import { CODE_LEN, CODE_MAX, PEG_HEX, PEGS, codeReward, type CodeEntry, type Peg } from "./code-daily";
import { Board } from "./daily-board";
import type { SimpleView } from "./data";
import { CHALLENGES } from "./rotation";

const Dot = ({ peg, size = 34, onClick, label }: { peg: Peg | null; size?: number; onClick?: () => void; label?: string }) => (
  <button
    type="button"
    disabled={!onClick}
    onClick={onClick}
    aria-label={label ?? (peg ?? "vide")}
    className="shrink-0 rounded-full shadow-inner ring-1 ring-black/10 transition disabled:cursor-default"
    style={{ width: size, height: size, background: peg ? `radial-gradient(circle at 35% 30%, #ffffffaa, transparent 45%), ${PEG_HEX[peg]}` : "#e4e4e7" }}
  />
);

/** Indices d'un essai : un point plein par couleur bien placée, un point creux par couleur mal placée. */
function Hints({ good, near }: { good: number; near: number }) {
  const dots = [...Array(good).fill("good"), ...Array(near).fill("near"), ...Array(CODE_LEN - good - near).fill("none")];
  return (
    <span className="grid grid-cols-2 gap-1" aria-label={`${good} bien placée${good > 1 ? "s" : ""}, ${near} mal placée${near > 1 ? "s" : ""}`}>
      {dots.map((d, i) => <span key={i} className={`size-2.5 rounded-full ${d === "good" ? "bg-zinc-900" : d === "near" ? "border-2 border-zinc-500 bg-white" : "bg-zinc-200"}`} />)}
    </span>
  );
}

export function DailyCode({ roomId, view, me, people }: { roomId: string; view: SimpleView<CodeEntry>; me: string; people: Record<string, Person> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<(Peg | null)[]>(Array(CODE_LEN).fill(null));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const a = view.attempt;
  const left = CODE_MAX - a.log.length;
  const solution = Array.isArray(view.solution) ? (view.solution as Peg[]) : null;

  const put = (p: Peg) => setDraft((d) => { const i = d.indexOf(null); if (i < 0) return d; const n = [...d]; n[i] = p; return n; });
  const clear = (i: number) => setDraft((d) => { const n = [...d]; n[i] = null; return n; });
  const send = () =>
    start(async () => {
      const res = await codeGuess(roomId, draft);
      if (res.error) setMsg({ ok: false, text: res.error });
      else {
        setDraft(Array(CODE_LEN).fill(null));
        setMsg(res.solved ? { ok: true, text: `Code trouvé ! +${res.reward} pièces.` } : null);
      }
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="eyebrow">Défi du jour · Code secret</p>
        <h2 className="text-2xl font-bold tracking-tight">
          {a.solved ? `Trouvé en ${a.log.length} essai${a.log.length > 1 ? "s" : ""} !` : a.done ? "Raté pour aujourd'hui" : "Trouve le code du jour"}
        </h2>
        <p className="text-sm text-zinc-500">
          {CHALLENGES.code.pitch} Une couleur peut revenir plusieurs fois.
          {a.solved ? ` Tu as gagné ${a.reward ?? codeReward(a.log.length)} pièces.` : a.done ? "" : ` Gain si tu trouves à cet essai : ${codeReward(a.log.length + 1)} pièces.`}
        </p>
      </header>

      {msg && <p role="status" className={`rounded-2xl px-4 py-3 text-center text-sm font-medium ${msg.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{msg.text}</p>}

      <ol className="space-y-2 rounded-3xl bg-white p-3 shadow-sm">
        {a.log.map((e, k) => (
          <li key={k} className="flex items-center gap-3">
            <span className="w-5 text-right text-xs tabular-nums text-zinc-400">{k + 1}</span>
            <span className="flex flex-1 gap-2">{e.guess.map((p, i) => <Dot key={i} peg={p} size={30} />)}</span>
            <Hints good={e.good} near={e.near} />
          </li>
        ))}
        {!a.done && (
          <li className="flex items-center gap-3 rounded-2xl bg-indigo-50/60 py-1.5">
            <span className="w-5 text-right text-xs tabular-nums text-indigo-400">{a.log.length + 1}</span>
            <span className="flex flex-1 gap-2">{draft.map((p, i) => <Dot key={i} peg={p} size={30} onClick={p ? () => clear(i) : undefined} label={p ? `Retirer ${p}` : "Case vide"} />)}</span>
            <span className="w-[1.4rem]" />
          </li>
        )}
        {a.done && solution && (
          <li className="flex items-center gap-3 border-t border-zinc-100 pt-2">
            <span className="w-5 text-right text-xs text-zinc-400">✓</span>
            <span className="flex flex-1 items-center gap-2">{solution.map((p, i) => <Dot key={i} peg={p} size={30} />)}<span className="text-xs text-zinc-500">le code</span></span>
          </li>
        )}
      </ol>

      {!a.done && (
        <div className="space-y-3">
          <div className="flex justify-center gap-2.5">
            {PEGS.map((p) => <Dot key={p} peg={p} size={40} onClick={pending ? undefined : () => put(p)} label={`Ajouter ${p}`} />)}
          </div>
          <button disabled={pending || draft.includes(null)} onClick={send} className="btn w-full">
            {draft.includes(null) ? `Choisis encore ${draft.filter((d) => !d).length} couleur${draft.filter((d) => !d).length > 1 ? "s" : ""}` : `Essayer ce code (${left} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""})`}
          </button>
          <p className="text-center text-xs text-zinc-500">● bien placée · ○ présente mais mal placée · touche une couleur posée pour la retirer</p>
        </div>
      )}

      <Board title="Classement du jour" rows={view.today} me={me} people={people} kind="code" live />
      {view.yesterday.length > 0 && <Board title={`Hier · ${CHALLENGES[view.yesterdayKind].name}`} rows={view.yesterday} me={me} people={people} kind={view.yesterdayKind} />}
      <p className="text-center text-xs text-zinc-400">Un nouveau défi chaque jour à minuit : Orapa, Code secret, Mot du jour…</p>
    </div>
  );
}
