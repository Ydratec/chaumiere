"use client";

import { useState, useSyncExternalStore } from "react";
import { BUILDINGS, isBuilding } from "./catalog";

const noop = () => () => {};
const read = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true; // stockage indisponible : on n'affiche rien plutôt que de répéter
  }
};

/**
 * Fenêtre « tes objets en trop ont été retirés » : une seule fois par appareil. `page` : ligne du journal
 * (trim:<date>|planter=27;pot=13|<pièces remboursées>), écrite quand les serres ont été remises aux règles.
 */
export function TrimNotice({ roomId, page }: { roomId: string; page: string }) {
  const key = `trim:${roomId}:${page}`;
  const seen = useSyncExternalStore(noop, () => read(key), () => true);
  const [closed, setClosed] = useState(false);
  if (seen || closed) return null;
  const [, what, refund] = page.split("|");
  const lines = what.split(";").map((w) => w.split("=")).filter(([k]) => isBuilding(k)).map(([k, n]) => `${n} × ${BUILDINGS[k as keyof typeof BUILDINGS].name.toLowerCase()}`);
  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(key, "1");
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[1250] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-label="Serres remises aux règles">
      <button aria-label="Fermer" onClick={close} className="absolute inset-0 bg-black/45" />
      <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl">
        <p className="eyebrow">À la serre</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">Les serres ont été remises aux règles</h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-zinc-600">
          Chacun a désormais un nombre d&apos;objets limité, qui augmente au fil de l&apos;histoire. Les objets en trop ont été retirés de ta serre et remboursés.
        </p>
        <div className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
          <p className="font-semibold">Retiré de ta serre</p>
          <p className="mt-1">{lines.join(", ")}</p>
          <p className="mt-1">{refund} pièces remboursées, plus les récoltes prêtes ou les ingrédients rendus.</p>
        </div>
        <button onClick={close} className="btn mt-5 w-full">Compris</button>
      </div>
    </div>
  );
}
