"use client";

import { useState, useTransition } from "react";
import { giveGift } from "./actions";
import { BouquetArt, ItemIcon } from "./art";
import { ITEMS, type Inventory } from "./catalog";
import { BOUQUET_MAX, FLOWERS, MESSAGE_MAX, rarityOf } from "./flowers";

/** En visite : laisser une fleur, ou composer un bouquet, avec un mot écrit par soi (un cadeau par jour et par ami). */
export function GiftButton({ roomId, receiver, done, items }: { roomId: string; receiver: string; done: boolean; items: Inventory }) {
  const [pick, setPick] = useState<Inventory>({});
  const [message, setMessage] = useState("");
  const [state, setState] = useState(done ? "Déjà offert aujourd'hui" : "");
  const [pending, startTransition] = useTransition();
  const owned = FLOWERS.filter((f) => (items[f.id] ?? 0) > 0);
  const total = Object.values(pick).reduce((n, v) => n + (v ?? 0), 0);
  const sent = state === "Cadeau offert !";

  if (state)
    return <p role="status" className={`rounded-2xl px-4 py-3 text-center text-sm font-medium ${sent ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>{state}</p>;
  if (!owned.length) return <p className="rounded-2xl bg-zinc-100 px-4 py-3 text-center text-sm text-zinc-500">Récolte des fleurs d&apos;abord pour en offrir.</p>;

  const add = (id: (typeof FLOWERS)[number]["id"], d: number) => {
    const n = Math.max(0, Math.min(items[id] ?? 0, (pick[id] ?? 0) + d));
    if (d > 0 && total >= BOUQUET_MAX) return;
    setPick({ ...pick, [id]: n });
  };

  return (
    <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm">
      <h3 className="eyebrow">Offrir une fleur, ou un bouquet</h3>
      <div className="grid grid-cols-4 gap-2">
        {owned.map((f) => {
          const n = pick[f.id] ?? 0;
          return (
            <div key={f.id} className={`relative flex flex-col items-center rounded-2xl p-2 ${n ? "bg-indigo-50 ring-2 ring-indigo-500" : "bg-zinc-50"}`}>
              <button type="button" aria-label={`Ajouter ${ITEMS[f.id].name}`} onClick={() => add(f.id, 1)} className="flex flex-col items-center active:scale-95">
                <ItemIcon id={f.id} size={34} />
                <span className="mt-0.5 w-full truncate text-center text-[10px] font-medium">{ITEMS[f.id].name}</span>
                <span className="text-[10px] text-zinc-400">{rarityOf(f.id)}</span>
              </button>
              <span className="mt-1 text-[11px] tabular-nums text-zinc-500">{n} / {items[f.id]}</span>
              {n > 0 && (
                <button type="button" aria-label={`Retirer ${ITEMS[f.id].name}`} onClick={() => add(f.id, -1)} className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-white text-sm font-bold text-zinc-600 shadow">−</button>
              )}
            </div>
          );
        })}
      </div>
      {total > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3">
          {total === 1 ? <ItemIcon id={Object.keys(pick).find((k) => pick[k as keyof Inventory])! as never} size={56} /> : <BouquetArt contents={pick} size={72} />}
          <p className="text-sm text-zinc-600">{total === 1 ? "Une fleur" : `Un bouquet de ${total} fleurs`} <span className="text-zinc-400">(jusqu&apos;à {BOUQUET_MAX})</span></p>
        </div>
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={MESSAGE_MAX}
        rows={2}
        placeholder="Écris un petit mot pour lui ou elle…"
        className="field resize-none bg-zinc-50"
      />
      <button
        disabled={pending || total === 0}
        onClick={() => startTransition(async () => {
          const clean = Object.fromEntries(Object.entries(pick).filter(([, v]) => (v ?? 0) > 0)) as Inventory;
          setState((await giveGift(roomId, receiver, clean, message)) || "Cadeau offert !");
        })}
        className="btn w-full"
      >
        {total === 0 ? "Choisis une ou plusieurs fleurs" : total === 1 ? "Offrir cette fleur" : `Offrir le bouquet (${total})`}
      </button>
    </section>
  );
}
