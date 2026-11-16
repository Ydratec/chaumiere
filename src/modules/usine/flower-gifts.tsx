"use client";

import { useEffect, useState, useTransition } from "react";
import { BouquetArt, GiftArt, ItemIcon } from "@/src/modules/farm/art";
import { isItem, type Inventory } from "@/src/modules/farm/catalog";
import type { Gift } from "@/src/modules/farm/data";
import { GiftButton } from "@/src/modules/farm/gift-button";
import { giftInfo, openFlowerGift } from "./gifts";

/** Ce que contient un cadeau : une fleur, ou un bouquet. */
function GiftContents({ gift, size }: { gift: Gift; size: number }) {
  return gift.item === "bouquet" && gift.contents ? <BouquetArt contents={gift.contents} size={size} /> : <ItemIcon id={isItem(gift.item) ? gift.item : "flower"} size={size} />;
}

const game = () => document.querySelector<HTMLIFrameElement>('iframe[title="Usine de Noël"]');

/**
 * Cadeaux de fleurs, autour du jeu de l'usine (comme dans l'ancienne serre) :
 * - offrir : le jeu demande la fenêtre (« Offrir » dans Visiter, ou « Offrir des fleurs » en visite) ;
 * - recevoir : les cadeaux qui attendent s'ouvrent un par un à l'arrivée sur l'onglet.
 */
export function FlowerGifts({ roomId, gifts, names }: { roomId: string; gifts: Gift[]; names: Record<string, string> }) {
  const [waiting, setWaiting] = useState(gifts);
  const [shown, setShown] = useState(gifts.length > 0);
  const [revealed, setRevealed] = useState<Gift | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [info, setInfo] = useState<{ items: Inventory; done: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin || ev.source !== game()?.contentWindow) return;
      const d = ev.data as { type?: string; to?: unknown };
      if (d?.type !== "usine:gift" || typeof d.to !== "string" || !names[d.to]) return;
      const who = d.to;
      setTo(who);
      setInfo(null);
      giftInfo(roomId, who).then(setInfo).catch(() => setTo(null));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [roomId, names]);

  const closeGive = () => {
    setTo(null);
    game()?.contentWindow?.postMessage({ type: "usine:flowers" }, window.location.origin); // le jeu relit les fleurs
  };
  const next = waiting[0];

  return (
    <>
      {to && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal aria-label={`Offrir des fleurs à ${names[to]}`}>
          <button aria-label="Fermer" onClick={closeGive} className="absolute inset-0 bg-black/45" />
          <div className="relative max-h-[85dvh] w-full max-w-sm space-y-3 overflow-y-auto rounded-[1.75rem] bg-zinc-50 p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Pour {names[to]}</h2>
              <button onClick={closeGive} className="text-sm text-zinc-500">Fermer</button>
            </div>
            {info ? <GiftButton key={to} roomId={roomId} receiver={to} done={info.done} items={info.items} /> : <p className="py-6 text-center text-sm text-zinc-500">Un instant…</p>}
          </div>
        </div>
      )}

      {(revealed || (shown && next)) && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/35" />
          <div className="animate-pop relative w-full max-w-xs rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
            {revealed ? (
              <>
                <div className="animate-pop mx-auto w-fit"><GiftContents gift={revealed} size={96} /></div>
                <p className="mt-3 text-lg font-semibold italic leading-snug">{revealed.message ? `« ${revealed.message} »` : "Un cadeau, sans un mot."}</p>
                <p className="mt-2 text-sm text-zinc-500">— {names[revealed.giver] ?? "Quelqu'un"}</p>
                <p className="mt-4 text-xs text-zinc-400">Ajouté à ta collection (et à ton album).</p>
                <button onClick={() => setRevealed(null)} className="btn mt-4 w-full">Merci !</button>
              </>
            ) : (
              next && (
                <>
                  <div className="mx-auto size-24 animate-bounce"><GiftArt /></div>
                  <p className="mt-3 text-lg font-semibold">{names[next.giver] ?? "Quelqu'un"} t&apos;a laissé un cadeau</p>
                  {waiting.length > 1 && <p className="mt-1 text-sm text-zinc-500">et {waiting.length - 1} autre{waiting.length > 2 ? "s" : ""} t&apos;attend{waiting.length > 2 ? "ent" : ""}</p>}
                  <button
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                      const g = await openFlowerGift(roomId, next.id);
                      setWaiting((w) => w.filter((x) => x.id !== next.id));
                      setRevealed(g ?? next);
                    })}
                    className="btn mt-4 w-full"
                  >
                    Ouvrir
                  </button>
                  <button onClick={() => setShown(false)} className="mt-2 text-sm text-zinc-500">Plus tard</button>
                </>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}
