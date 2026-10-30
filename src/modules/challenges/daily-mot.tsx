"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import type { Person } from "@/src/modules/rooms/context";
import { motGuess } from "./actions";
import { Board } from "./daily-board";
import type { SimpleView } from "./data";
import { MOT_LEN, MOT_MAX, motReward, normalize, type Mark, type MotEntry } from "./mot-daily";
import { CHALLENGES } from "./rotation";

const TILE: Record<Mark | "empty" | "typed", string> = {
  ok: "bg-green-600 text-white border-green-600",
  near: "bg-amber-400 text-white border-amber-400",
  no: "bg-zinc-400 text-white border-zinc-400",
  typed: "bg-white text-zinc-900 border-zinc-400",
  empty: "bg-white/60 border-zinc-200",
};
const ROWS = ["azertyuiop", "qsdfghjklm", "wxcvbn"];

export function DailyMot({ roomId, view, me, people }: { roomId: string; view: SimpleView<MotEntry>; me: string; people: Record<string, Person> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [typed, setTyped] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [shake, setShake] = useState(false);
  const a = view.attempt;

  // État de chaque lettre sur le clavier : bien placée > présente > absente.
  const keys: Record<string, Mark> = {};
  for (const e of a.log) e.word.split("").forEach((l, i) => {
    const m = e.marks[i], was = keys[l];
    if (m === "ok" || (m === "near" && was !== "ok") || (m === "no" && !was)) keys[l] = m;
  });

  const send = () => {
    if (typed.length !== MOT_LEN || pending) return;
    start(async () => {
      const res = await motGuess(roomId, typed);
      if (res.error) { setMsg({ ok: false, text: res.error }); setShake(true); setTimeout(() => setShake(false), 400); }
      else { setTyped(""); setMsg(res.solved ? { ok: true, text: `Bravo ! +${res.reward} pièces.` } : null); }
      router.refresh();
    });
  };
  const press = (k: string) => {
    if (a.done) return;
    setMsg(null);
    if (k === "enter") send();
    else if (k === "back") setTyped((t) => t.slice(0, -1));
    else setTyped((t) => (t.length < MOT_LEN ? t + k : t));
  };
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Enter") press("enter");
    else if (e.key === "Backspace") press("back");
    else { const l = normalize(e.key); if (l.length === 1) press(l); }
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const rows = Array.from({ length: MOT_MAX }, (_, r) => {
    const e = a.log[r];
    if (e) return e.word.split("").map((l, i) => ({ l, s: e.marks[i] as Mark | "typed" | "empty" }));
    if (r === a.log.length && !a.done) return Array.from({ length: MOT_LEN }, (_, i) => ({ l: typed[i] ?? "", s: (typed[i] ? "typed" : "empty") as "typed" | "empty" }));
    return Array.from({ length: MOT_LEN }, () => ({ l: "", s: "empty" as const }));
  });

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="eyebrow">Défi du jour · Mot du jour</p>
        <h2 className="text-2xl font-bold tracking-tight">
          {a.solved ? `Trouvé en ${a.log.length} essai${a.log.length > 1 ? "s" : ""} !` : a.done ? "Raté pour aujourd'hui" : "Trouve le mot du jour"}
        </h2>
        <p className="text-sm text-zinc-500">
          {CHALLENGES.mot.pitch} Vert : bien placée. Jaune : dans le mot, ailleurs. Gris : absente. Les accents ne comptent pas.
          {a.solved ? ` Tu as gagné ${a.reward ?? motReward(a.log.length)} pièces.` : a.done ? "" : ` Gain si tu trouves à cet essai : ${motReward(a.log.length + 1)} pièces.`}
        </p>
      </header>

      {msg && <p role="status" className={`rounded-2xl px-4 py-3 text-center text-sm font-medium ${msg.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{msg.text}</p>}
      {a.done && !a.solved && typeof view.solution === "string" && (
        <p className="rounded-2xl bg-zinc-100 px-4 py-3 text-center text-sm">Le mot était <strong className="uppercase tracking-widest">{view.solution}</strong>.</p>
      )}

      <div className="mx-auto grid w-full max-w-[19rem] gap-1.5" aria-label="Grille des essais">
        {rows.map((row, r) => (
          <div key={r} className={`grid grid-cols-5 gap-1.5 ${shake && r === a.log.length ? "animate-[shake_.35s]" : ""}`}>
            {row.map((c, i) => (
              <span key={i} className={`flex aspect-square items-center justify-center rounded-lg border-2 text-xl font-bold uppercase transition-colors ${TILE[c.s]}`}>{c.l}</span>
            ))}
          </div>
        ))}
      </div>

      {!a.done && (
        <div className="space-y-1.5" aria-label="Clavier">
          {ROWS.map((row, r) => (
            <div key={r} className="flex justify-center gap-1">
              {r === 2 && <button type="button" onClick={() => press("enter")} disabled={pending || typed.length !== MOT_LEN} className="h-12 rounded-lg bg-indigo-600 px-2.5 text-xs font-bold text-white disabled:opacity-40">OK</button>}
              {row.split("").map((k) => (
                <button key={k} type="button" onClick={() => press(k)} disabled={pending}
                  className={`h-12 min-w-0 flex-1 basis-0 rounded-lg text-base font-semibold uppercase ${keys[k] === "ok" ? "bg-green-600 text-white" : keys[k] === "near" ? "bg-amber-400 text-white" : keys[k] === "no" ? "bg-zinc-300 text-zinc-500" : "bg-white text-zinc-800 shadow-sm"}`}>
                  {k}
                </button>
              ))}
              {r === 2 && <button type="button" onClick={() => press("back")} disabled={pending} aria-label="Effacer" className="h-12 rounded-lg bg-white px-3 text-lg shadow-sm">⌫</button>}
            </div>
          ))}
        </div>
      )}

      <Board title="Classement du jour" rows={view.today} me={me} people={people} kind="mot" live />
      {view.yesterday.length > 0 && <Board title={`Hier · ${CHALLENGES[view.yesterdayKind].name}`} rows={view.yesterday} me={me} people={people} kind={view.yesterdayKind} />}
      <p className="text-center text-xs text-zinc-400">Un nouveau défi chaque jour à minuit : Orapa, Code secret, Mot du jour…</p>
    </div>
  );
}
