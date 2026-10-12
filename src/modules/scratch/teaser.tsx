"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const noop = () => () => {};
const read = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true; // stockage indisponible : on n'affiche rien plutôt que de répéter
  }
};

/** Petite fenêtre à la prochaine connexion : les tickets à gratter sont arrivés. Une seule fois par appareil et par salle. */
export function ScratchTeaser({ roomId }: { roomId: string }) {
  const key = `news:scratch:${roomId}`;
  const seen = useSyncExternalStore(noop, () => read(key), () => true);
  const [closed, setClosed] = useState(false);
  if (seen || closed) return null;
  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(key, "1");
    } catch {}
  };
  return (
    <div className="fixed inset-0 z-[1230] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-label="Nouveauté">
      <button aria-label="Fermer" onClick={close} className="absolute inset-0 bg-black/45" />
      <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl">
        <div className="-mt-12 mb-2 flex justify-center">
          <span className="flex size-20 rotate-[-6deg] items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-300 text-4xl shadow-lg ring-4 ring-white">🎟️</span>
        </div>
        <p className="eyebrow">Nouveau dans l&apos;onglet Jeux</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">Tickets à gratter !</h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-zinc-600">
          Achète un ticket avec tes pièces et gratte-le pour de vrai, au doigt. Trois tickets (de 50 à 1&nbsp;000 pièces), des règles qui changent à chaque fois, des lots jusqu&apos;à 100&nbsp;000 pièces et même des fleurs rares.
        </p>
        <Link href={`/r/${roomId}/games`} onClick={close} className="btn mt-5 w-full">Voir les tickets</Link>
        <button onClick={close} className="mt-3 text-sm text-zinc-500">Plus tard</button>
      </div>
    </div>
  );
}
