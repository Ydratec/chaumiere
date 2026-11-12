"use client";

import { useEffect, useRef, useState } from "react";
import { ItemIcon } from "@/src/modules/farm/art";
import { closeSerre, type SerreSale } from "./serre";

/** Pop-up de fermeture de la serre : vend tout (sauf les fleurs) à la première visite de l'onglet Usine, puis l'annonce. */
export function SerreClosing({ roomId }: { roomId: string }) {
  const [sale, setSale] = useState<SerreSale | null>(null);
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    closeSerre(roomId).then(setSale).catch(() => {});
  }, [roomId]);
  if (!sale) return null;
  return (
    <div role="dialog" aria-label="La serre ferme" className="fixed inset-0 z-[1250] flex items-center justify-center bg-black/60 p-6">
      <div className="max-w-sm space-y-3 rounded-3xl bg-white p-6 text-center shadow-xl">
        <p className="text-4xl">🎄</p>
        <h2 className="text-xl font-bold">Il est temps de préparer Noël !</h2>
        <p className="text-sm text-zinc-600">La serre ferme ses portes : place à l&apos;Usine de Noël des lutins.</p>
        {sale.coins > 0 && (
          <p className="text-sm">
            Tout ce qu&apos;il y avait dans ta serre a été vendu :{" "}
            <span className="inline-flex items-center gap-1 font-bold">+{sale.coins.toLocaleString("fr-FR")} <ItemIcon id="coins" size={16} /></span>
          </p>
        )}
        {sale.flowers > 0 && <p className="text-sm text-zinc-600">Tes {sale.flowers} fleurs sont gardées : la serre de l&apos;usine te permettra d&apos;en refaire pousser.</p>}
        <button onClick={() => setSale(null)} className="btn w-full">C&apos;est parti !</button>
      </div>
    </div>
  );
}
