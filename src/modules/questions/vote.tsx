"use client";

import { useOptimistic, useState } from "react";
import { answer } from "@/app/actions";
import { Avatar } from "@/src/components/avatar";
import { Medal } from "@/src/components/medal";
import { characterColor } from "@/src/modules/characters/catalog";
import type { ActivityProps } from "../activities/registry";
import { candidates } from "./formats";
import { tally } from "./tally";
import { questionLabel } from "./themes";

/**
 * Question de vote : on choisit un membre ; ensuite, une ligne par personne qui a des voix, avec une barre à la
 * couleur de son personnage. Toucher une ligne déplie le détail : qui a voté pour elle.
 */
export function VoteActivity({ activity, userId, names, people, answers: saved, voteLocked }: ActivityProps) {
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
  // « avec qui » : on ne peut pas se choisir ; une question qui vise quelqu'un ({x}) ne le propose pas
  const everyone = Object.entries(people).map(([id, p]) => ({ id, name: p.name }));
  const members = candidates(everyone, activity.payload.kind === "with" ? "with" : "vote", userId, activity.payload.target);
  // Résultats : tout le monde (sauf la personne visée), soi compris : en « avec qui » on ne peut pas se choisir,
  // mais on doit voir qui nous a choisi.
  const results = candidates(everyone, "vote", userId, activity.payload.target);
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
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 transition active:scale-95 ${picked === m.id ? "bg-indigo-50 ring-2 ring-indigo-500" : "sticker"}`}
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

  const { rows: all, total } = tally(answers, results);
  const rows = all.filter((r) => r.voters.length > 0); // seulement ceux qui ont des voix
  const zero = all.filter((r) => !r.voters.length);

  return (
    <>
      <section className="pt-2">
        <p className="eyebrow">{questionLabel(activity, names)} · {activity.payload.kind === "with" ? "avec qui" : "vote"}</p>
        <h2 className="mt-2 text-[1.7rem] font-bold leading-tight tracking-tight">{activity.payload.text}</h2>
      </section>

      {!mine ? (
        choices
      ) : (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="eyebrow">{total} vote{total > 1 ? "s" : ""}</h3>
            <span className="text-sm font-bold text-zinc-600">Ton vote : {mine.content === userId ? "toi" : (people[mine.content]?.name ?? "?")}</span>
          </div>
          {rows.map((r) => {
            const place = rows.filter((x) => x.voters.length > r.voters.length).length; // ex æquo : même place
            const color = characterColor(people[r.id]?.character);
            const pct = Math.round((r.voters.length / Math.max(1, total)) * 100);
            return (
              <details key={r.id} className="group sticker overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                  <span className="flex w-6 shrink-0 justify-center">{place < 3 ? <Medal rank={place} /> : <span className="font-display font-bold text-zinc-500">{place + 1}</span>}</span>
                  {person(r.id, 40)}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-display text-lg font-bold leading-tight">
                        {r.id === userId ? "Toi" : r.name}
                        {mine.content === r.id && <span className="ml-1.5 rounded-full bg-ink px-2 py-0.5 align-middle font-sans text-[10px] font-extrabold text-white">ton vote</span>}
                      </span>
                      <span className="shrink-0 font-display text-2xl font-extrabold leading-none tabular-nums">{r.voters.length}</span>
                    </span>
                    <span className="mt-1.5 block h-4 overflow-hidden rounded-full border-2 border-ink bg-zinc-100">
                      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(6, r.share * 100)}%`, background: color }} />
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-zinc-500">{pct} % des voix · toucher pour voir qui</span>
                  </span>
                  <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0 transition group-open:rotate-180" aria-hidden>
                    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className="flex flex-wrap gap-2 border-t-2 border-dashed border-ink/20 px-3 pb-3 pt-3">
                  {r.voters.map((v) => (
                    <span key={v} className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-white py-0.5 pl-0.5 pr-2.5 text-sm font-bold">
                      {person(v, 26)}
                      {v === userId ? "Toi" : (people[v]?.name ?? "?")}
                    </span>
                  ))}
                </div>
              </details>
            );
          })}
          {zero.length > 0 && (
            <p className="px-1 text-sm text-zinc-500">Pas de voix : {zero.map((r) => (r.id === userId ? "toi" : r.name)).join(", ")}</p>
          )}
          {voteLocked ? (
            <p className="pt-1 text-xs text-zinc-500">Vote définitif dans cette salle.</p>
          ) : (
            <details className="pt-1 text-sm">
              <summary className="cursor-pointer font-display font-bold text-zinc-600">Changer mon vote</summary>
              <div className="mt-3">{choices}</div>
            </details>
          )}
        </section>
      )}
    </>
  );
}
