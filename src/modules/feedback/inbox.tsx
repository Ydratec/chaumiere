"use client";

import { useTransition } from "react";
import { markDone } from "./actions";
import type { Inbox } from "./data";

/** Retours des joueurs, pour le super-admin (sur l'accueil). */
export function FeedbackInbox({ roomId, items }: { roomId: string; items: Inbox }) {
  const [pending, start] = useTransition();
  return (
    <section className="space-y-3">
      <h2 className="eyebrow">Retours des joueurs · {items.length}</h2>
      {items.map((f) => (
        <article key={f.id} className={`rounded-2xl p-4 ${f.kind === "wish" ? "bg-amber-50 ring-1 ring-amber-300" : "sticker"}`}>
          <p className="font-display text-sm font-bold text-zinc-600">
            {f.kind === "wish" ? "★ Vœu payé" : "Retour"} · {f.who} · {f.room}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap leading-6">{f.text}</p>
          <button disabled={pending} onClick={() => start(() => markDone(f.id, roomId))} className="mt-2 text-sm font-medium text-indigo-600">Marquer comme traité</button>
        </article>
      ))}
    </section>
  );
}
