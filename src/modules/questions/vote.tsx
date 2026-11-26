"use client";

import { useOptimistic, useState } from "react";
import { answer } from "@/app/actions";
import { Avatar } from "@/src/components/avatar";
import { characterColor } from "@/src/modules/characters/catalog";
import type { ActivityProps } from "../activities/registry";
import { candidates } from "./formats";
import { tally } from "./tally";
import { questionLabel } from "./themes";

/**
 * Question de vote : on choisit un membre ; ensuite, une ligne par personne qui a des voix : sa barre, à la
 * couleur de son personnage, est faite des visages de ceux qui ont voté pour elle. Toucher une ligne fait
 * apparaître leurs noms en bulles dessous.
 */
export function VoteActivity({ activity, userId, names, people, answers: saved, voteLocked }: ActivityProps) {
  // Le vote s'affiche tout de suite ; le serveur confirme ensuite (et corrige si besoin).
  const [answers, vote] = useOptimistic(saved, (all, target: string) => [
    ...all.filter((a) => a.user_id !== userId),
    { user_id: userId, content: target },
  ]);
  const mine = answers.find((a) => a.user_id === userId);
  const [picked, setPicked] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null); // ligne de résultat dépliée (qui a voté)
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
          <div className="space-y-2.5">
            {rows.map((r) => {
              const on = open === r.id, faces = r.voters.slice(0, 7), color = characterColor(people[r.id]?.character);
              return (
                <div key={r.id}>
                  <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : r.id)} className="flex w-full items-center gap-2.5 text-left">
                    {person(r.id, 36)}
                    <span className="w-14 shrink-0 truncate font-display text-base font-bold">{r.id === userId ? "Toi" : r.name}</span>
                    <span className="flex min-w-0 items-center rounded-full border-2 border-ink py-[3px] pl-[5px] pr-3" style={{ background: color }}>
                      {faces.map((v, k) => <span key={v} className={k ? "-ml-1.5" : ""}>{person(v, 26)}</span>)}
                      {r.voters.length > faces.length && <span className="-ml-1.5 flex size-[26px] items-center justify-center rounded-full border-2 border-ink bg-white text-[11px] font-extrabold">+{r.voters.length - faces.length}</span>}
                      <span className={`ml-2 font-display text-lg font-extrabold leading-none ${dark(color) ? "text-white" : ""}`}>{r.voters.length}</span>
                    </span>
                  </button>
                  {on && (
                    <div className="mb-1 ml-[46px] mt-2 flex flex-wrap gap-1.5">
                      {r.voters.map((v) => (
                        <span key={v} className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-white py-0.5 pl-0.5 pr-2.5 text-[13px] font-extrabold">
                          {person(v, 22)}
                          {v === userId ? "Toi" : (people[v]?.name ?? "?")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

/** Couleur foncée (texte blanc dessus) ? */
function dark(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
