"use client";

import { useOptimistic, useState } from "react";
import { answer } from "@/app/actions";
import { Avatar } from "@/src/components/avatar";
import type { ActivityProps } from "../activities/registry";
import { tally } from "./tally";

/** Question de vote : on choisit un membre ; ensuite, histogramme des voix avec les bulles des votants. */
export function VoteActivity({ activity, userId, people, answers: saved, voteLocked }: ActivityProps) {
  // Le vote s'affiche tout de suite ; le serveur confirme ensuite (et corrige si besoin).
  const [answers, vote] = useOptimistic(saved, (all, target: string) => [
    ...all.filter((a) => a.user_id !== userId),
    { user_id: userId, content: target },
  ]);
  const mine = answers.find((a) => a.user_id === userId);
  const [picked, setPicked] = useState<string | null>(null);
  async function submit(f: FormData) {
    if (!f.get("content")) return;
    setPicked(null);
    vote(String(f.get("content")));
    await answer(f);
  }
  const members = Object.entries(people).map(([id, p]) => ({ id, name: p.name }));
  const person = (id: string, size: number) => (
    <Avatar url={people[id]?.url} character={people[id]?.character} name={people[id]?.name ?? "?"} size={size} />
  );

  // Toucher un membre le sélectionne seulement ; le vote part avec le bouton de validation (pas de vote par erreur).
  const choices = (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="activity_id" value={activity.id} />
      <input type="hidden" name="content" value={picked ?? ""} />
      <div className="grid grid-cols-3 gap-2">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={picked === m.id}
            onClick={() => setPicked(m.id)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 transition active:scale-95 ${picked === m.id ? "bg-indigo-50 ring-2 ring-indigo-500" : "bg-white shadow-sm"}`}
          >
            {person(m.id, 48)}
            <span className="w-full truncate text-center text-sm font-medium">{m.id === userId ? "Moi" : m.name}</span>
          </button>
        ))}
      </div>
      <button disabled={!picked || picked === mine?.content} className="btn w-full">
        {!picked
          ? "Choisis quelqu'un"
          : `Valider mon vote pour ${picked === userId ? "moi" : (people[picked]?.name ?? "?")}${voteLocked ? " (définitif)" : ""}`}
      </button>
    </form>
  );

  const { rows, total } = tally(answers, members);

  return (
    <>
      <section className="pt-2">
        <p className="eyebrow">Question du jour · vote</p>
        <h2 className="mt-2 text-[1.7rem] font-bold leading-tight tracking-tight">{activity.payload.text}</h2>
      </section>

      {!mine ? (
        choices
      ) : (
        <section className="space-y-4">
          <h3 className="eyebrow">{total} vote{total > 1 ? "s" : ""}</h3>
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3">
              <div className="flex w-20 shrink-0 items-center gap-2">
                {person(r.id, 32)}
                <span className="truncate text-xs font-medium">{r.id === userId ? "Moi" : r.name}</span>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <div
                  className={`flex h-8 items-center justify-end rounded-full pr-2 text-xs font-bold text-white transition-[width] duration-500 ${
                    i === 0 && r.voters.length ? "bg-indigo-600" : r.voters.length ? "bg-indigo-400" : "bg-zinc-200"
                  }`}
                  style={{ width: `max(${r.voters.length ? "2rem" : "0.5rem"}, ${r.share * 62}%)` }}
                >
                  {r.voters.length || ""}
                </div>
                <div className="flex shrink-0 -space-x-2">
                  {r.voters.slice(0, 5).map((v) => (
                    <span key={v} className="rounded-full ring-2 ring-[var(--background)]" title={people[v]?.name}>{person(v, 24)}</span>
                  ))}
                  {r.voters.length > 5 && (
                    <span className="flex size-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold ring-2 ring-[var(--background)]">+{r.voters.length - 5}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {voteLocked ? (
            <p className="pt-2 text-xs text-zinc-500">Vote définitif dans cette salle.</p>
          ) : (
            <details className="pt-2 text-sm">
              <summary className="cursor-pointer text-zinc-500">Changer mon vote</summary>
              <div className="mt-3">{choices}</div>
            </details>
          )}
        </section>
      )}
    </>
  );
}
