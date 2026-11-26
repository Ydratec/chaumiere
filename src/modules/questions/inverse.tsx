"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ItemIcon } from "@/src/modules/farm/art";
import { buyInverse } from "./shop-actions";
import { INVERSE_PRICE } from "./themes";

/** Sous une question qui a une inverse choisie d'avance : payer pour la poser à toute la salle. */
export function InverseOffer({ roomId, activityId, inverse, coins }: { roomId: string; activityId: string; inverse: string; coins: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const coin = (n: number) => <span className="inline-flex items-center gap-1">{n} <ItemIcon id="coins" size={14} /></span>;
  const poor = coins < INVERSE_PRICE;
  const buy = () =>
    start(async () => {
      const r = await buyInverse(roomId, activityId);
      if (r.error) return setError(r.error);
      setOpen(false);
      router.refresh();
    });

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="sticker flex w-full items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium transition active:scale-95">
        <span>Poser la question inverse</span>
        <span className="shrink-0 text-xs text-zinc-500">{coin(INVERSE_PRICE)}</span>
      </button>
    );

  return (
    <div className="sticker space-y-2 rounded-2xl p-3">
      <p className="text-sm font-semibold">La question inverse</p>
      <p className="rounded-xl bg-zinc-50 p-2.5 font-semibold leading-snug">{inverse}</p>
      <p className="text-xs text-zinc-500">Elle s&apos;affichera ici, sous celle-ci, pour toute la salle.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-zinc-100 px-4 text-sm font-semibold">Annuler</button>
        <button type="button" onClick={buy} disabled={pending || poor} className="btn flex-1">
          {poor ? "Pas assez de pièces" : <>Poser · {coin(INVERSE_PRICE)}</>}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
