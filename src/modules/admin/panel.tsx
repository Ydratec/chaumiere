"use client";

import { useState, useTransition } from "react";
import { ITEMS, type ItemId } from "@/src/modules/farm/catalog";
import { finishTimers, giveItems, newQuestion, resetFarm, resetUnlocks, unlockAll, unlockSkins } from "./actions";

export function AdminPanel({ roomId }: { roomId: string }) {
  const [msg, setMsg] = useState("");
  const [item, setItem] = useState<ItemId>("wheat");
  const [qty, setQty] = useState(20);
  const [pending, startTransition] = useTransition();
  const run = (f: () => Promise<string>, ask?: string) => {
    if (ask && !confirm(ask)) return;
    startTransition(async () => setMsg(await f()));
  };
  const btn = "btn-soft w-full justify-start bg-white py-3 shadow-sm";

  return (
    <div className="space-y-8">
      {msg && <p role="status" className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">{msg}</p>}

      <section className="space-y-2">
        <h2 className="eyebrow">Question du jour</h2>
        <button disabled={pending} className={btn} onClick={() => run(() => newQuestion(roomId, "vote"), "Remplacer la question du jour ? Ses réponses et sa discussion seront supprimées.")}>Nouvelle question de vote</button>
        <button disabled={pending} className={btn} onClick={() => run(() => newQuestion(roomId, "open"), "Remplacer la question du jour ? Ses réponses et sa discussion seront supprimées.")}>Nouvelle question ouverte</button>
      </section>

      <section className="space-y-2">
        <h2 className="eyebrow">Serre</h2>
        <div className="grid grid-cols-2 gap-2">
          <button disabled={pending} className={btn} onClick={() => run(() => giveItems(roomId, "coins", 100))}>+100 pièces</button>
          <button disabled={pending} className={btn} onClick={() => run(() => giveItems(roomId, "coins", 1000))}>+1000 pièces</button>
        </div>
        <div className="flex gap-2">
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="field w-24 bg-white text-center shadow-sm" />
          <select value={item} onChange={(e) => setItem(e.target.value as ItemId)} className="field min-w-0 flex-1 bg-white shadow-sm">
            {(Object.keys(ITEMS) as ItemId[]).map((k) => <option key={k} value={k}>{ITEMS[k].name}</option>)}
          </select>
          <button disabled={pending} className="btn px-4" onClick={() => run(() => giveItems(roomId, item, qty))}>Donner</button>
        </div>
        <button disabled={pending} className={btn} onClick={() => run(() => finishTimers(roomId))}>Terminer toutes mes productions</button>
        <button disabled={pending} className={btn} onClick={() => run(() => resetFarm(roomId), "Effacer ta serre (objets, réserve, pièces) ?")}>Réinitialiser ma serre</button>
      </section>

      <section className="space-y-2">
        <h2 className="eyebrow">Déblocages</h2>
        <button disabled={pending} className={btn} onClick={() => run(() => unlockAll(roomId))}>Débloquer tous les projets de la salle</button>
        <button disabled={pending} className={btn} onClick={() => run(() => unlockSkins(roomId))}>Débloquer tous les personnages et accessoires</button>
        <button disabled={pending} className={`${btn} text-red-600`} onClick={() => run(() => resetUnlocks(roomId), "Remettre à zéro les déblocages et les dons de toute la salle ?")}>Réinitialiser les déblocages de la salle</button>
      </section>
    </div>
  );
}
