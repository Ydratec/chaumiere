"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import type { Person } from "@/src/modules/rooms/context";
import { submitPuzzle } from "./actions";
import { Board } from "./daily-board";
import type { PuzzleKind, PuzzleView } from "./data";
import { CHALLENGES, duration } from "./rotation";

const noop = () => () => {};
/** Rendu seulement dans le navigateur (le brouillon vient du stockage de l'appareil). */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(noop, () => true, () => false);
  return ready ? <>{children}</> : <div className="aspect-square animate-pulse rounded-3xl bg-zinc-200/70" />;
}

/** Brouillon gardé sur l'appareil (on peut quitter la page et revenir). */
export function usePersist<T>(key: string, init: () => T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (raw) return JSON.parse(raw) as T;
    } catch {}
    return init();
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV] as const;
}

/** Chronomètre depuis l'ouverture du défi. */
function Clock({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return <span className="tabular-nums">{duration(Math.max(0, Math.floor((now - Date.parse(since)) / 1000)))}</span>;
}

export type Submit = (answer: unknown) => void;

/**
 * Cadre commun des jeux de réflexion : titre, règles, chronomètre, message, classement du jour et d'hier.
 * `children` reçoit la fonction pour proposer sa solution et l'état « en cours d'envoi ».
 */
export function PuzzleShell({ roomId, kind, view, me, people, rules, children }: {
  roomId: string; kind: PuzzleKind; view: PuzzleView; me: string; people: Record<string, Person>; rules: React.ReactNode;
  children: (submit: Submit, pending: boolean) => React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const a = view.attempt, c = CHALLENGES[kind];
  const timed = kind === "picross" || kind === "queens" || kind === "hashi";
  const submit: Submit = (answer) =>
    start(async () => {
      const res = await submitPuzzle(roomId, kind, answer);
      if (res.error) setMsg({ ok: false, text: res.error });
      else if (res.right === false) setMsg({ ok: false, text: "Pas encore ! Cherche encore (+1 min au score)." });
      else if (timed) setMsg({ ok: true, text: `Bravo ! ${c.unit(res.score ?? 0)} · +${res.reward} pièces.` });
      else setMsg({ ok: true, text: res.reward ? `Enregistré : ${c.unit(res.score ?? 0)} · +${res.reward} pièces.` : `${c.unit(res.score ?? 0)} : ton meilleur résultat reste celui d'avant.` });
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="eyebrow">Défi du jour · {c.name}</p>
        <h2 className="text-2xl font-bold tracking-tight">
          {a.solved ? (timed ? `Trouvé en ${c.unit(a.score ?? 0)}` : `Ton meilleur : ${c.unit(a.score ?? 0)}`) : c.pitch}
        </h2>
        <div className="text-sm text-zinc-500">{rules}</div>
        <p className="flex flex-wrap gap-x-3 text-sm font-medium text-zinc-600">
          {timed && !a.solved && <span>⏱ <Clock since={a.startedAt} /></span>}
          {timed && a.misses > 0 && !a.solved && <span>{a.misses} vérification{a.misses > 1 ? "s" : ""} ratée{a.misses > 1 ? "s" : ""}</span>}
          {a.solved && <span>Gagné : {a.reward ?? 0} pièces</span>}
        </p>
      </header>
      {msg && <p role="status" className={`rounded-2xl px-4 py-3 text-center text-sm font-medium ${msg.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{msg.text}</p>}
      {children(submit, pending)}
      <Board title="Classement du jour" rows={view.today} me={me} people={people} kind={kind} live />
      {view.yesterday.length > 0 && <Board title={`Hier · ${CHALLENGES[view.yesterdayKind].name}`} rows={view.yesterday} me={me} people={people} kind={view.yesterdayKind} />}
      <p className="text-center text-xs text-zinc-400">Un nouveau défi chaque jour à minuit : Orapa, Picross, Embouteillage, Reines, Le compte est bon, Hashi.</p>
    </div>
  );
}
