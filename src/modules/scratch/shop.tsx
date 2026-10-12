"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ItemIcon } from "@/src/modules/farm/art";
import { buyTicket, type Card } from "./actions";
import { ScratchCard } from "./scratch-card";
import { jackpot, PRIZES, TICKETS, winRate, type Kind } from "./tickets";

const KINDS = Object.keys(TICKETS) as Kind[];
const coin = (n: number, size = 14) => <span className="inline-flex items-center gap-1 font-semibold tabular-nums">{n.toLocaleString("fr-FR")} <ItemIcon id="coins" size={size} /></span>;

/** Boutique de tickets à gratter : trois tickets, ceux qu'on n'a pas fini de gratter, et le ticket en cours. */
export function ScratchShop({ roomId, coins, pending }: { roomId: string; coins: number; pending: Card[] }) {
  const router = useRouter();
  const [active, setActive] = useState<Card | null>(null);
  const [done, setDone] = useState<{ id: number; kind: string; prize: string | null } | null>(null);
  const [left, setLeft] = useState(pending); // tickets achetés pas encore grattés
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const buy = (kind: Kind) =>
    start(async () => {
      const r = await buyTicket(roomId, kind);
      if (r.error) return setError(r.error);
      setError("");
      setDone(null);
      setActive(r.card!);
      setLeft((l) => [...l, r.card!]);
      router.refresh();
    });
  const finished = (card: Card, prize: string | null) => {
    setDone({ id: card.id, kind: card.kind, prize });
    setLeft((l) => l.filter((c) => c.id !== card.id));
    router.refresh();
  };

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Tickets à gratter</h2>
        <span className="text-sm">{coin(coins, 16)}</span>
      </div>

      {active && <ScratchCard key={active.id} roomId={roomId} card={active} onDone={(p) => finished(active, p)} />}

      {done && (
        <div role="status" className={`rounded-2xl px-4 py-3 text-center ${done.prize ? "bg-amber-50 text-amber-900" : "bg-zinc-100 text-zinc-600"}`}>
          <p className="text-lg font-bold">{done.prize ? (done.prize === jackpot(done.kind as Kind) ? "JACKPOT !!!" : "Gagné !") : "Perdu… la prochaine sera la bonne !"}</p>
          {done.prize && <p className="text-sm">{PRIZES[done.prize].label}, ajouté à ta réserve.</p>}
          <button onClick={() => buy(done.kind as Kind)} disabled={busy || coins < TICKETS[done.kind as Kind].price} className="btn mt-3 w-full">
            Racheter un ticket {TICKETS[done.kind as Kind].name} · {coin(TICKETS[done.kind as Kind].price, 16)}
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-2">
        {KINDS.map((k) => {
          const t = TICKETS[k];
          return (
            <button key={k} disabled={busy || coins < t.price} onClick={() => buy(k)} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition active:scale-[0.98] disabled:opacity-50">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-300 text-xl font-bold">{t.name[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t.name}</span>
                <span className="block text-xs text-zinc-500">Gros lot {PRIZES[jackpot(k)].label.replace(" pièces", "")} · {Math.round(winRate(k) * 100)} % de tickets gagnants</span>
              </span>
              <span className="text-sm">{coin(t.price)}</span>
            </button>
          );
        })}
      </div>

      {left.filter((c) => c.id !== active?.id).length > 0 && (
        <div className="space-y-2">
          <h3 className="eyebrow">Tickets à finir de gratter</h3>
          {left.filter((c) => c.id !== active?.id).map((c) => (
            <button key={c.id} onClick={() => { setActive(c); setDone(null); }} className="btn-soft w-full">Gratter un ticket {TICKETS[c.kind as Kind].name}</button>
          ))}
        </div>
      )}
      <p className="text-xs text-zinc-500">Chaque ticket a une règle tirée au hasard. En moyenne, un ticket rend un peu moins que sa mise : joue pour le plaisir !</p>
    </section>
  );
}
