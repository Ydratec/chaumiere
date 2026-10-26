"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Avatar } from "@/src/components/avatar";
import type { Person } from "@/src/modules/rooms/context";
import { EditableBoard, Plateau, Rules, WaveLog, result, same, useDraft } from "../games/orapa-board";
import { trace, W, H, type Color, type LogEntry } from "../games/orapa";
import { dailyGuess, dailyProbe, dailyWave } from "./actions";
import type { DailyView, Ranking } from "./data";
import { isWave, MISS_COST, PROBE_COST, rewardOf } from "./orapa-daily";

const noop = () => () => {};

/** Défi Orapa du jour : la même grille pour toute la salle ; moins d'ondes = mieux (un essai raté compte 3). */
export function DailyOrapa(props: { roomId: string; view: DailyView; me: string; people: Record<string, Person> }) {
  const ready = useSyncExternalStore(noop, () => true, () => false); // brouillon gardé sur l'appareil
  if (!ready) return <div className="aspect-[10/12] animate-pulse rounded-2xl bg-slate-800/80" />;
  return <Game {...props} />;
}

function Game({ roomId, view, me, people }: { roomId: string; view: DailyView; me: string; people: Record<string, Person> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const guess = useDraft(`defi:orapa:${roomId}:${view.day}`);
  const a = view.attempt;
  const name = (id: string) => (id === me ? "toi" : (people[id]?.name ?? "?"));

  const entries = a.log.map((w, k) => ({
    e: (isWave(w) ? { by: me, from: w.from, to: w.to, colors: w.colors as Color[] } : { by: me, probe: w.probe, color: w.color as Color | null }) as LogEntry,
    k,
  }));
  const waves = entries.flatMap(({ e }) => ("from" in e ? [e] : []));
  const probes = entries.flatMap(({ e }) => ("probe" in e ? [e] : []));
  const picked = sel !== null ? entries[sel]?.e : null;
  const active = (picked && "from" in picked ? picked : waves.at(-1)) ?? null;
  const check = !a.solved && guess.any ? (w: (typeof waves)[number]) => same(trace(guess.grid, w.from), w) : undefined;
  const r = active && result(active);

  const send = (from: string) =>
    start(async () => {
      const res = await dailyWave(roomId, from);
      setMsg(res.error ? { ok: false, text: res.error } : null);
      setSel(null);
      router.refresh();
    });
  const ask = (cell: number) =>
    start(async () => {
      const res = await dailyProbe(roomId, cell);
      setMsg(res.error ? { ok: false, text: res.error } : null);
      router.refresh();
    });
  const tryIt = () =>
    confirm(`Tenter cette grille ? Si elle est fausse, ça compte comme ${MISS_COST} ondes (tu peux réessayer).`) &&
    start(async () => {
      const res = await dailyGuess(roomId, guess.grid);
      setMsg(res.error ? { ok: false, text: res.error } : res.right ? { ok: true, text: `Trouvé ! +${res.reward} pièces.` } : { ok: false, text: `Raté : +${MISS_COST} au score. Cherche encore !` });
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="eyebrow">Défi du jour · Orapa Mine</p>
        <h2 className="text-2xl font-bold tracking-tight">{a.solved ? `Trouvé en ${a.score} coup${a.score > 1 ? "s" : ""} !` : "Trouve la grille du jour"}</h2>
        <p className="text-sm text-zinc-500">
          La même grille pour toute la salle. Le moins de coups possible : chaque onde compte 1, chaque case demandée {PROBE_COST}, chaque essai raté {MISS_COST}.
          {a.solved ? ` Tu as gagné ${a.reward ?? rewardOf(a.score)} pièces.` : ` Score actuel : ${a.score} · gain si tu trouves maintenant : ${rewardOf(a.score)} pièces.`}
        </p>
      </header>

      {msg && <p role="status" className={`rounded-2xl px-4 py-3 text-center text-sm font-medium ${msg.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{msg.text}</p>}

      <p className="flex min-h-7 items-center justify-center gap-2 text-sm">
        {active && r ? (
          <>
            <span className="font-semibold tabular-nums">{active.from}</span>→
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-white">
              <span className="size-2.5 rounded-full" style={{ background: r.name === "absorbée" ? "#fff" : r.hex }} />
              {r.name}
            </span>
            → <span className="font-semibold tabular-nums">{active.to ?? "·"}</span>
            {check && <span className={`text-xs font-semibold ${check(active) ? "text-green-600" : "text-amber-600"}`}>{check(active) ? "✓" : "≠ ta grille"}</span>}
          </>
        ) : (
          !a.solved && <span className="text-zinc-500">Touche un repère du bord pour envoyer une onde.</span>
        )}
      </p>

      {a.solved && view.solution ? (
        <Plateau grid={view.solution} waves={waves} active={active} probes={probes} />
      ) : (
        <>
          <EditableBoard ed={guess} plateau={{ onEdge: pending ? undefined : send, waves, active, faded: check, probes }} onProbe={pending ? undefined : ask} probeHint={`Ça compte ${PROBE_COST} coups.`} />
          <button disabled={guess.left > 0 || pending} onClick={tryIt} className="btn w-full">
            {guess.left ? `Pose encore ${guess.left} gemme${guess.left > 1 ? "s" : ""} pour tenter` : "Tenter ma grille"}
          </button>
        </>
      )}

      <section>
        <h3 className="eyebrow mb-1">Tes ondes et cases demandées{a.misses ? ` · ${a.misses} essai${a.misses > 1 ? "s" : ""} raté${a.misses > 1 ? "s" : ""}` : ""}</h3>
        <WaveLog entries={entries} name={name} active={active} onSel={setSel} check={check} />
      </section>

      <Board title="Classement du jour" rows={view.today} me={me} people={people} live />
      {view.yesterday.length > 0 && <Board title="Hier" rows={view.yesterday} me={me} people={people} />}
      <Rules />
      <p className="text-center text-xs text-zinc-400">Grille {W} × {H} · nouvelle grille chaque jour à minuit</p>
    </div>
  );
}

function Board({ title, rows, me, people, live = false }: { title: string; rows: Ranking; me: string; people: Record<string, Person>; live?: boolean }) {
  if (!rows.length) return live ? <p className="text-center text-sm text-zinc-500">Personne n&apos;a encore commencé aujourd&apos;hui. À toi !</p> : null;
  let rank = 0;
  return (
    <section>
      <h3 className="eyebrow mb-1">{title}</h3>
      <ol className="rows">
        {rows.map((r) => {
          if (r.solved) rank++;
          const p = people[r.user];
          return (
            <li key={r.user} className={`flex items-center gap-3 py-2.5 text-sm ${r.user === me ? "font-semibold" : ""}`}>
              <span className="w-5 text-right tabular-nums text-zinc-400">{r.solved ? rank : "·"}</span>
              <Avatar url={p?.url} character={p?.character} name={p?.name ?? "?"} size={28} />
              <span className="flex-1 truncate">{p?.name ?? "?"}</span>
              <span className={`tabular-nums ${r.solved ? "" : "text-zinc-400"}`}>
                {r.solved ? `${r.score} coup${r.score > 1 ? "s" : ""}` : "cherche encore…"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
