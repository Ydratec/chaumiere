"use client";

import { useState, useTransition } from "react";
import { ItemIcon } from "@/src/modules/farm/art";
import { sendFeedback, makeWish } from "./actions";
import { MAX_TEXT, WISH_PRICE } from "./constants";

/** Retour libre (gratuit) et demande spéciale (très chère), côté joueur. */
export function FeedbackForms({ roomId, coins }: { roomId: string; coins: number }) {
  const [feedback, setFeedback] = useState("");
  const [wish, setWish] = useState("");
  const [fMsg, setFMsg] = useState("");
  const [wMsg, setWMsg] = useState("");
  const [pending, start] = useTransition();
  const price = WISH_PRICE.toLocaleString("fr-FR");

  return (
    <>
      <section className="space-y-3">
        <h2 className="eyebrow">Un retour, une idée ?</h2>
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} maxLength={MAX_TEXT} placeholder="Un bug, une remarque, une idée… ça arrive directement chez l'admin." className="field resize-y bg-white shadow-sm" />
        <button
          disabled={pending || !feedback.trim()}
          className="btn w-full"
          onClick={() => start(async () => {
            const e = await sendFeedback(roomId, feedback);
            setFMsg(e || "Merci, c'est bien envoyé !");
            if (!e) setFeedback("");
          })}
        >
          Envoyer mon retour
        </button>
        {fMsg && <p role="status" className="text-sm text-zinc-600">{fMsg}</p>}
      </section>

      <section className="space-y-3 rounded-3xl bg-amber-50 p-5">
        <h2 className="eyebrow text-amber-700">Demande spéciale</h2>
        <p className="text-sm text-amber-900">
          Tu veux quelque chose de précis dans le jeu (une fonction, un objet, un mini-jeu…) ? Dis-le-moi : je regarde ta demande en priorité. Ça coûte très cher.
        </p>
        <textarea value={wish} onChange={(e) => setWish(e.target.value)} rows={3} maxLength={MAX_TEXT} placeholder="J'aimerais que…" className="field resize-y bg-white shadow-sm" />
        <button
          disabled={pending || !wish.trim() || coins < WISH_PRICE}
          className="btn w-full"
          onClick={() => confirm(`Envoyer cette demande pour ${price} pièces ?`) && start(async () => {
            const e = await makeWish(roomId, wish);
            setWMsg(e || "Demande envoyée, merci !");
            if (!e) setWish("");
          })}
        >
          {coins < WISH_PRICE ? <>Il te faut {price} <ItemIcon id="coins" size={16} /> (tu as {coins})</> : <>Envoyer · {price} <ItemIcon id="coins" size={16} /></>}
        </button>
        {wMsg && <p role="status" className="text-sm text-amber-900">{wMsg}</p>}
      </section>
    </>
  );
}
