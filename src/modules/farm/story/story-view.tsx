"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ItemIcon } from "../art";
import { ITEMS, type Inventory, type ItemId } from "../catalog";
import { claimEvent, completeQuest, deliverOrder } from "./actions";
import { NPCS } from "./ch1";
import { Dialog } from "./dialog";
import type { StoryData } from "./data";
import { NpcPortrait } from "./npc-art";
import type { Line } from "./types";

const coin = (n: number, size = 14) => <span className="inline-flex items-center gap-1 font-semibold">{n} <ItemIcon id="coins" size={size} /></span>;

/** Onglet « Histoire » : la quête en cours, les commandes du jour, les événements, le journal de Mirabelle. */
export function StoryView({ roomId, story, items, catchNote }: { roomId: string; story: StoryData; items: Inventory; catchNote: string | null }) {
  const router = useRouter();
  const [scene, setScene] = useState<{ lines: Line[]; after?: () => void } | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const { quest, chapter } = story;
  const refresh = () => router.refresh();

  const finish = () =>
    quest &&
    start(async () => {
      const r = await completeQuest(roomId, quest.id);
      if (r.error) return setMsg(r.error);
      setMsg("");
      setScene({ lines: quest.outro, after: refresh });
    });
  const deliver = (id: number) =>
    start(async () => {
      const r = await deliverOrder(roomId, id);
      setMsg(r.error ?? (r.bonus ? `Les trois commandes du jour sont livrées : bonus de ${r.bonus} pièces !` : ""));
      refresh();
    });

  const p = quest?.progress;
  const met = !!p && p.have >= p.need;

  return (
    <div className="space-y-7">
      {scene && <Dialog roomId={roomId} lines={scene.lines} onDone={() => { scene.after?.(); setScene(null); }} />}

      <header className="space-y-1">
        <p className="eyebrow">Chapitre {chapter.n} · {chapter.title}</p>
        <h2 className="text-2xl font-bold tracking-tight">{chapter.actTitle || "Prologue"}</h2>
        <p className="text-sm text-zinc-500">Jour {chapter.day} · {chapter.done} / {chapter.total} quêtes</p>
      </header>

      {story.events.map((e) => (
        <section key={e.id} className="rounded-3xl bg-amber-50 p-4 text-amber-900">
          <p className="eyebrow text-amber-700">Événement</p>
          <p className="mt-1 font-semibold">{e.title}</p>
          <p className="text-sm">{e.text}</p>
          {e.scene && (
            <button disabled={pending} onClick={() => setScene({ lines: e.scene!, after: () => start(async () => { await claimEvent(roomId, e.id); refresh(); }) })} className="btn mt-3 w-full">
              Voir ce qui se passe
            </button>
          )}
        </section>
      ))}

      {catchNote && <p className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{catchNote}</p>}

      {quest ? (
        <section className="space-y-3 rounded-[1.75rem] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <NpcPortrait who={quest.intro[0].who} size={52} />
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Quête en cours</p>
              <h3 className="text-lg font-bold leading-tight">{quest.title}</h3>
            </div>
          </div>
          <button onClick={() => setScene({ lines: quest.intro })} className="btn-soft w-full">
            Écouter {NPCS[quest.intro[0].who].name}
          </button>
          {p && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-600">{p.label}</p>
              {p.items ? (
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(p.items) as [ItemId, number][]).map(([k, n]) => (
                    <span key={k} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${(items[k] ?? 0) >= n ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}>
                      <ItemIcon id={k} size={18} /> {Math.min(items[k] ?? 0, n)} / {n}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-indigo-500 transition-[width]" style={{ width: `${(p.have / p.need) * 100}%` }} />
                </div>
              )}
              {!p.items && <p className="text-xs text-zinc-500">{p.have} / {p.need}</p>}
            </div>
          )}
          <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            Récompense : {coin(quest.reward.coins ?? 0)}
            {quest.reward.unlocks?.some((u) => u.startsWith("b:")) && <span>· un nouveau bâtiment</span>}
            {quest.reward.unlocks?.some((u) => u.startsWith("cap:")) && <span>· plus de place</span>}
          </p>
          <button disabled={!met || pending} onClick={finish} className="btn w-full">{met ? "Terminer la quête" : "Pas encore…"}</button>
        </section>
      ) : story.next ? (
        <section className="rounded-[1.75rem] bg-white p-5 text-center shadow-sm">
          <p className="eyebrow">Prochain épisode</p>
          <h3 className="mt-1 text-lg font-bold">{story.next.title}</h3>
          <p className="mt-1 text-sm text-zinc-500">dans {story.next.inDays} jour{story.next.inDays > 1 ? "s" : ""}</p>
          {story.next.teaser && <p className="mt-3 text-sm italic text-zinc-600">« {story.next.teaser} »</p>}
        </section>
      ) : (
        <section className="rounded-[1.75rem] bg-white p-5 text-center shadow-sm">
          <p className="font-semibold">{story.finished ? "À suivre…" : "Rien à faire pour l'instant."}</p>
          <p className="mt-1 text-sm text-zinc-500">La suite de l&apos;histoire arrive bientôt.</p>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="eyebrow">Commandes du village · aujourd&apos;hui</h3>
        <div className="space-y-2">
          {story.orders.map((o) => {
            const ok = !o.done && (Object.entries(o.wants) as [ItemId, number][]).every(([k, n]) => (items[k] ?? 0) >= n);
            return (
              <div key={o.id} className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ${o.done ? "opacity-50" : ""}`}>
                <NpcPortrait who={o.npc} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {(Object.entries(o.wants) as [ItemId, number][]).map(([k, n]) => (
                      <span key={k} className={`inline-flex items-center gap-1 text-sm ${(items[k] ?? 0) >= n ? "text-emerald-700" : ""}`}>
                        <ItemIcon id={k} size={18} /> {n} <span className="text-zinc-500">{ITEMS[k].name.toLowerCase()}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">{NPCS[o.npc].name} · {coin(o.reward, 12)}</p>
                </div>
                <button disabled={!ok || pending} onClick={() => deliver(o.id)} className="btn-soft px-3 py-1.5 text-xs">{o.done ? "Livrée" : "Livrer"}</button>
              </div>
            );
          })}
        </div>
      </section>

      {msg && <p role="status" className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{msg}</p>}

      <section className="rounded-3xl bg-zinc-100/70 p-4">
        <div className="flex gap-3">
          <NpcPortrait who={story.daily.who} size={44} />
          <div>
            <p className="eyebrow">Le mot du jour · {NPCS[story.daily.who].name}</p>
            <p className="mt-1 text-sm italic leading-relaxed text-zinc-700">« {story.daily.text} »</p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="eyebrow">Le journal de Mirabelle · {story.journal.length} page{story.journal.length > 1 ? "s" : ""}</h3>
        {story.journal.length === 0 && <p className="text-sm text-zinc-500">Les pages se dévoilent au fil des quêtes.</p>}
        {[...story.journal].reverse().map((j) => (
          <details key={j.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <summary className="cursor-pointer font-semibold">{j.title}</summary>
            <p className="mt-2 whitespace-pre-wrap font-serif text-[0.95rem] italic leading-relaxed text-zinc-700">{j.text}</p>
          </details>
        ))}
        {story.secrets > 0 && <p className="pt-1 text-sm text-amber-700">{story.secrets} secret{story.secrets > 1 ? "s" : ""} trouvé{story.secrets > 1 ? "s" : ""}.</p>}
      </section>
    </div>
  );
}
