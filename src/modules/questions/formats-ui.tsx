"use client";

import { useOptimistic, useState } from "react";
import { answer } from "@/app/actions";
import { Avatar } from "@/src/components/avatar";
import type { ActivityProps } from "../activities/registry";
import { candidates, choiceTally, duoTally, parseList, rankTally } from "./formats";
import { questionLabel } from "./themes";

/** Ce que les trois formats ont en commun : la réponse optimiste, l'envoi, les avatars, l'en-tête. */
function useAnswer({ activity, userId, answers: saved }: ActivityProps) {
  const [answers, set] = useOptimistic(saved, (all, content: string) => [...all.filter((a) => a.user_id !== userId), { user_id: userId, content }]);
  const mine = answers.find((a) => a.user_id === userId);
  async function send(content: string) {
    const f = new FormData();
    f.set("activity_id", activity.id); f.set("content", content);
    set(content);
    await answer(f);
  }
  return { answers, mine, send };
}
function Face({ people, id, size }: { people: ActivityProps["people"]; id: string; size: number }) {
  return <Avatar url={people[id]?.url} character={people[id]?.character} name={people[id]?.name ?? "?"} size={size} />;
}
function Header({ activity, names, tag }: { activity: ActivityProps["activity"]; names: Record<string, string>; tag: string }) {
  return (
    <section className="pt-2">
      <p className="eyebrow">{questionLabel(activity, names)} · {tag}</p>
      <h2 className="mt-2 text-[1.7rem] font-bold leading-tight tracking-tight">{activity.payload.text}</h2>
    </section>
  );
}
function Voters({ people, ids }: { people: ActivityProps["people"]; ids: string[] }) {
  return (
    <div className="flex shrink-0 -space-x-2">
      {ids.slice(0, 6).map((v) => <span key={v} className="rounded-full ring-2 ring-[var(--background)]" title={people[v]?.name}><Face people={people} id={v} size={24} /></span>)}
      {ids.length > 6 && <span className="flex size-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold ring-2 ring-[var(--background)]">+{ids.length - 6}</span>}
    </div>
  );
}
/** « Changer ma réponse », sauf si la salle a choisi les réponses définitives. */
function Change({ locked, label, children }: { locked?: boolean; label: string; children: React.ReactNode }) {
  if (locked) return <p className="pt-2 text-xs text-zinc-500">Réponse définitive dans cette salle.</p>;
  return (
    <details className="pt-2 text-sm">
      <summary className="cursor-pointer text-zinc-500">{label}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
const nameOf = (props: ActivityProps, id: string) => (id === props.userId ? "Moi" : (props.people[id]?.name ?? "?"));

// ---------------------------------------------------------------- tu préfères
export function ChoiceActivity(props: ActivityProps) {
  const { activity, people, voteLocked } = props;
  const options = activity.payload.options ?? [];
  const { answers, mine, send } = useAnswer(props);
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {options.map((o, i) => (
          <button key={i} type="button" aria-pressed={picked === i} onClick={() => setPicked(i)}
            className={`min-h-24 rounded-2xl p-4 text-center text-base font-bold leading-snug transition active:scale-95 ${picked === i ? "bg-indigo-50 ring-2 ring-indigo-500" : "bg-white shadow-sm"}`}>
            {o}
          </button>
        ))}
      </div>
      <button disabled={picked === null || String(picked) === mine?.content} onClick={() => { send(String(picked)); setPicked(null); }} className="btn w-full">
        {picked === null ? "Fais ton choix" : `Valider : ${options[picked]}`}
      </button>
    </div>
  );
  const t = choiceTally(answers, options.length);
  return (
    <>
      <Header activity={activity} names={props.names} tag="tu préfères" />
      {!mine ? pick : (
        <section className="space-y-4">
          <h3 className="eyebrow">{t.total} réponse{t.total > 1 ? "s" : ""}</h3>
          {t.rows.map((r) => (
            <div key={r.i} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className={`font-semibold ${mine.content === String(r.i) ? "text-indigo-700" : ""}`}>{options[r.i]}</span>
                <span className="text-sm font-bold tabular-nums">{Math.round(r.share * 100)} %</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-indigo-500 transition-[width] duration-500" style={{ width: `${r.share * 100}%` }} /></div>
                <Voters people={people} ids={r.voters} />
              </div>
            </div>
          ))}
          <Change locked={voteLocked} label="Changer mon choix">{pick}</Change>
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------- classe-nous
export function RankActivity(props: ActivityProps) {
  const { activity, people, userId, voteLocked } = props;
  const members = Object.entries(people).map(([id, p]) => ({ id, name: p.name }));
  const cands = candidates(members, "rank", userId, activity.payload.target);
  const { answers, mine, send } = useAnswer(props);
  const [order, setOrder] = useState<string[]>([]);
  // Toucher quelqu'un l'ajoute à la suite ; le retoucher le retire (les suivants remontent).
  const tap = (id: string) => setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const pick = (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">Touche les membres dans l&apos;ordre, du premier au dernier.</p>
      <div className="grid grid-cols-3 gap-2">
        {cands.map((m) => {
          const rank = order.indexOf(m.id);
          return (
            <button key={m.id} type="button" onClick={() => tap(m.id)}
              className={`relative flex flex-col items-center gap-1.5 rounded-2xl p-3 transition active:scale-95 ${rank >= 0 ? "bg-indigo-50 ring-2 ring-indigo-500" : "bg-white shadow-sm"}`}>
              {rank >= 0 && <span className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{rank + 1}</span>}
              <Face people={people} id={m.id} size={48} />
              <span className="w-full truncate text-center text-sm font-medium">{nameOf(props, m.id)}</span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        {order.length > 0 && <button type="button" onClick={() => setOrder([])} className="btn-soft">Recommencer</button>}
        <button disabled={order.length !== cands.length} onClick={() => { send(JSON.stringify(order)); setOrder([]); }} className="btn flex-1">
          {order.length === cands.length ? "Valider mon classement" : `Encore ${cands.length - order.length} à classer`}
        </button>
      </div>
    </div>
  );
  const t = rankTally(answers, cands);
  return (
    <>
      <Header activity={activity} names={props.names} tag="classement" />
      {!mine ? pick : (
        <section className="space-y-4">
          <h3 className="eyebrow">Ordre moyen · {t.total} classement{t.total > 1 ? "s" : ""}</h3>
          <ol className="space-y-2">
            {t.rows.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm">
                <span className="w-7 text-center text-lg font-bold tabular-nums text-indigo-600">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                <Face people={people} id={r.id} size={32} />
                <span className="min-w-0 flex-1 truncate font-semibold">{nameOf(props, r.id)}</span>
                {r.avg !== null && <span className="text-xs tabular-nums text-zinc-500">{r.avg.toFixed(1).replace(".", ",")}ᵉ en moyenne</span>}
              </li>
            ))}
          </ol>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-indigo-600">Le classement de chacun</summary>
            <div className="rows mt-2">
              {t.lists.map((l) => (
                <div key={l.user_id} className="py-2">
                  <p className="font-semibold">{nameOf(props, l.user_id)}</p>
                  <p className="text-zinc-600">{l.order.map((id, i) => `${i + 1}. ${nameOf(props, id)}`).join(" · ")}</p>
                </div>
              ))}
            </div>
          </details>
          <Change locked={voteLocked} label="Refaire mon classement">{pick}</Change>
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------- duo
export function DuoActivity(props: ActivityProps) {
  const { activity, people, userId, voteLocked } = props;
  const members = Object.entries(people).map(([id, p]) => ({ id, name: p.name }));
  const cands = candidates(members, "duo", userId, activity.payload.target);
  const { answers, mine, send } = useAnswer(props);
  const [duo, setDuo] = useState<string[]>([]);
  const tap = (id: string) => setDuo((d) => (d.includes(id) ? d.filter((x) => x !== id) : d.length < 2 ? [...d, id] : [d[1], id]));
  const pick = (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {cands.map((m) => (
          <button key={m.id} type="button" aria-pressed={duo.includes(m.id)} onClick={() => tap(m.id)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 transition active:scale-95 ${duo.includes(m.id) ? "bg-indigo-50 ring-2 ring-indigo-500" : "bg-white shadow-sm"}`}>
            <Face people={people} id={m.id} size={48} />
            <span className="w-full truncate text-center text-sm font-medium">{nameOf(props, m.id)}</span>
          </button>
        ))}
      </div>
      <button disabled={duo.length !== 2} onClick={() => { send(JSON.stringify(duo)); setDuo([]); }} className="btn w-full">
        {duo.length === 2 ? `Valider : ${nameOf(props, duo[0])} et ${nameOf(props, duo[1])}` : `Choisis ${2 - duo.length} personne${duo.length ? "" : "s"}`}
      </button>
    </div>
  );
  const t = duoTally(answers);
  return (
    <>
      <Header activity={activity} names={props.names} tag="duo" />
      {!mine ? pick : (
        <section className="space-y-4">
          <h3 className="eyebrow">Les duos les plus choisis</h3>
          {t.rows.map((r, i) => (
            <div key={r.pair.join("+")} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm">
              <span className="w-7 text-center text-lg">{["🥇", "🥈", "🥉"][i] ?? ""}</span>
              <div className="flex -space-x-2"><Face people={people} id={r.pair[0]} size={32} /><Face people={people} id={r.pair[1]} size={32} /></div>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{nameOf(props, r.pair[0])} & {nameOf(props, r.pair[1])}</span>
              <Voters people={people} ids={r.voters} />
            </div>
          ))}
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-indigo-600">Le duo de chacun</summary>
            <div className="rows mt-2">
              {answers.map((a) => { const l = parseList(a.content) ?? []; return (
                <p key={a.user_id} className="py-2"><span className="font-semibold">{nameOf(props, a.user_id)}</span> : {l.map((id) => nameOf(props, id)).join(" & ")}</p>
              ); })}
            </div>
          </details>
          <Change locked={voteLocked} label="Changer mon duo">{pick}</Change>
        </section>
      )}
    </>
  );
}
