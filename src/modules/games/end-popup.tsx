"use client";

import { useState, useSyncExternalStore } from "react";
import type { Person } from "@/src/modules/rooms/context";
import type { Game } from "./actions";
import { GameResult } from "./result";

const noop = () => () => {};
const read = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true; // stockage indisponible : on n'affiche rien plutôt que de répéter
  }
};

/** Pourquoi la partie s'est terminée, en clair (Orapa : essai juste ou faux ; tous les jeux : abandon). */
function reason(game: Game, me: string, name: (id: string) => string) {
  const s = game.state as Record<string, unknown> & { winner: string };
  const who = (id: string, tu: string, il: string) => (id === me ? `Tu ${tu}` : `${name(id)} ${il}`);
  if (typeof s.forfeit === "string") return `${who(s.forfeit, "as", "a")} abandonné.`;
  if (game.type !== "orapa") return null;
  const log = (s.log as { by: string; guess?: boolean; right?: boolean }[]) ?? [];
  const last = log.at(-1);
  if (!last?.guess) return null;
  if (s.winner === "draw") return "Les deux ont trouvé la bonne grille : égalité !";
  if (last.right) return `${who(last.by, "as", "a")} trouvé la bonne grille !`;
  return typeof s.found === "string"
    ? `${who(s.found, "avais", "avait")} trouvé, et la dernière chance était une grille fausse.`
    : `${who(last.by, "as", "a")} tenté une grille fausse : la partie s'arrête.`;
}

/** Grande fenêtre de fin de partie (une fois par partie et par appareil). */
export function EndPopup({ game, userId, people, name }: { game: Game; userId: string; people: Record<string, Person>; name: (id: string) => string }) {
  const key = `gameend:${game.id}`;
  const seen = useSyncExternalStore(noop, () => read(key), () => true);
  const [closed, setClosed] = useState(false);
  if (seen || closed || !game.state?.winner) return null;
  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(key, "1");
    } catch {}
  };
  const why = reason(game, userId, name);
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" role="dialog" aria-label="Fin de partie">
      <button aria-label="Fermer" onClick={close} className="absolute inset-0 bg-black/50" />
      <div className="animate-pop relative w-full max-w-sm space-y-4">
        <GameResult game={game} people={people} me={userId} big />
        {why && <p className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium shadow">{why}</p>}
        <button onClick={close} className="btn w-full">{game.type === "orapa" ? "Voir les grilles" : "Voir la partie"}</button>
      </div>
    </div>
  );
}
