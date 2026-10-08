"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Member } from "@/src/modules/rooms/context";
import { acceptOffer, cancelOffer, createOffer } from "./actions";
import { ItemIcon } from "./art";
import { ITEMS, type Inventory, type ItemId } from "./catalog";
import type { Offer } from "./data";
import { has } from "./rules";

const TRADABLE: ItemId[] = [...(Object.keys(ITEMS) as ItemId[]).filter((k) => k !== "coins"), "coins"];

function Bundle({ inv }: { inv: Inventory }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
      {(Object.entries(inv) as [ItemId, number][]).map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-0.5">{v}<ItemIcon id={k} size={20} /></span>
      ))}
    </span>
  );
}

export function Market({ roomId, offers, items, userId, members }: {
  roomId: string;
  offers: Offer[];
  items: Inventory;
  userId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();
  const [give, setGive] = useState<ItemId>("wheat");
  const [giveQty, setGiveQty] = useState(5);
  const [want, setWant] = useState<ItemId>("egg");
  const [wantQty, setWantQty] = useState(1);
  const name = (id: string) => members.find((m) => m.user_id === id)?.username ?? "?";

  const run = (f: () => Promise<string>) =>
    startTransition(async () => {
      setMsg(await f());
      router.refresh();
    });

  const select = (v: ItemId, set: (i: ItemId) => void) => (
    <select value={v} onChange={(e) => set(e.target.value as ItemId)} className="field min-w-0 flex-1 bg-white py-2.5 shadow-sm">
      {TRADABLE.map((k) => <option key={k} value={k}>{ITEMS[k].name}</option>)}
    </select>
  );
  const qty = (v: number, set: (n: number) => void) => (
    <input type="number" min={1} max={999} value={v} onChange={(e) => set(Number(e.target.value))} className="field w-20 bg-white py-2.5 text-center shadow-sm" />
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="eyebrow">Proposer un échange</h3>
        <div className="flex items-center gap-2"><span className="w-16 text-sm text-zinc-500">Je donne</span>{qty(giveQty, setGiveQty)}{select(give, setGive)}</div>
        <div className="flex items-center gap-2"><span className="w-16 text-sm text-zinc-500">Je veux</span>{qty(wantQty, setWantQty)}{select(want, setWant)}</div>
        <button disabled={pending} onClick={() => run(() => createOffer(roomId, { [give]: giveQty }, { [want]: wantQty }))} className="btn w-full">
          Publier l&apos;offre
        </button>
      </section>

      {msg && <p role="alert" className="text-center text-sm text-red-700">{msg}</p>}

      <section>
        <h3 className="eyebrow mb-1">Offres de la salle</h3>
        {offers.length === 0 && <p className="py-2 text-sm text-zinc-500">Aucune offre pour l&apos;instant.</p>}
        <ul className="rows">
          {offers.map((o) => {
            const mine = o.seller === userId;
            return (
              <li key={o.id} className="flex items-center gap-3 py-3">
                <span className="w-16 truncate text-sm font-medium">{mine ? "Toi" : name(o.seller)}</span>
                <span className="flex flex-1 items-center gap-2 text-sm">
                  <Bundle inv={o.give} /> <span className="text-zinc-400">contre</span> <Bundle inv={o.want} />
                </span>
                {mine ? (
                  <button disabled={pending} onClick={() => run(() => cancelOffer(roomId, o.id))} className="btn-soft px-3 py-1.5 text-xs">Annuler</button>
                ) : (
                  <button disabled={pending || !has(items, o.want)} onClick={() => run(() => acceptOffer(roomId, o.id))} className="btn px-3 py-1.5 text-xs">
                    Accepter
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

    </div>
  );
}
