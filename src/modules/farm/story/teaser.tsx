"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { NpcPortrait } from "./npc-art";

const noop = () => () => {};
const flag = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true; // stockage indisponible : on n'affiche rien plutôt que de répéter
  }
};

/**
 * Fenêtre à la première connexion : « ça arrive demain » (avant le début de l'histoire), puis « ça commence » (une fois lancée).
 * Une seule fois par appareil, salle et chapitre.
 */
export function StoryTeaser({ roomId, chapter, phase }: { roomId: string; chapter: number; phase: "soon" | "live" }) {
  const key = `story:${roomId}:${chapter}:${phase}`;
  const seen = useSyncExternalStore(noop, () => flag(key), () => true); // true côté serveur : pas d'écart à l'hydratation
  const [closed, setClosed] = useState(false);
  if (seen || closed) return null;
  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(key, "1");
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-label="Nouveauté à la serre">
      <button aria-label="Fermer" onClick={close} className="absolute inset-0 bg-black/45" />
      <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl">
        <div className="-mt-14 mb-3 flex justify-center">
          <span className="rounded-3xl bg-white p-1 shadow-lg ring-4 ring-white"><NpcPortrait who="mirabelle" size={72} /></span>
        </div>
        {phase === "soon" ? (
          <>
            <p className="eyebrow">À la serre · dès demain</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Quelque chose se réveille…</h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-zinc-600">
              Demain, une histoire commence au Hameau des Brumes : des habitants à rencontrer, des quêtes, des commandes, des événements, et peut-être quelques secrets bien cachés.
            </p>
            <p className="mt-3 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600">
              La serre change un peu : le nombre de bacs et de pots sera limité au départ, et de nouvelles places se débloqueront en avançant dans l&apos;histoire.
            </p>
            <button onClick={close} className="btn mt-5 w-full">J&apos;ai hâte !</button>
          </>
        ) : (
          <>
            <p className="eyebrow">Un courrier est arrivé</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Le Hameau des Brumes</h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-zinc-600">
              Mirabelle a laissé quelque chose pour vous à la serre. L&apos;histoire commence : ouvrez l&apos;onglet « Histoire » pour la rencontrer.
            </p>
            <Link href={`/r/${roomId}/farm`} onClick={close} className="btn mt-5 w-full">Aller à la serre</Link>
            <button onClick={close} className="mt-3 text-sm text-zinc-500">Plus tard</button>
          </>
        )}
      </div>
    </div>
  );
}
