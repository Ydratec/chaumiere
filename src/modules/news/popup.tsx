"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { NpcPortrait } from "../farm/story/npc-art";
import { activeNews } from "./news";

const noop = () => () => {};
const flag = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true; // stockage indisponible : on n'affiche rien plutôt que de répéter
  }
};

/** Fenêtre d'annonce : la première annonce en cours pas encore vue sur cet appareil. */
export function NewsPopup({ roomId }: { roomId: string }) {
  const [now] = useState(() => Date.now());
  const news = activeNews(now);
  const keys = news.map((n) => `news:${n.id}`).join("|");
  // une lettre par annonce : "1" vue, "0" pas encore ; "" côté serveur (rien à l'hydratation)
  const seen = useSyncExternalStore(noop, () => (keys ? keys.split("|").map((k) => (flag(k) ? "1" : "0")).join("") : ""), () => "");
  const [closed, setClosed] = useState<string[]>([]);
  const n = news.find((x, i) => seen[i] === "0" && !closed.includes(x.id));
  if (!seen || !n) return null;
  const close = () => {
    setClosed((c) => [...c, n.id]);
    try {
      localStorage.setItem(`news:${n.id}`, "1");
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[1210] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-label={n.title}>
      <button aria-label="Fermer" onClick={close} className="absolute inset-0 bg-black/55" />
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-2xl">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-indigo-950/90 via-indigo-900/40 to-transparent" />
        <div className="relative mb-3 flex justify-center pt-1">
          <span className="rounded-3xl bg-white p-1 shadow-lg ring-4 ring-white/70"><NpcPortrait who={n.who} size={72} /></span>
        </div>
        <p className="eyebrow relative">{n.eyebrow}</p>
        <h2 className="relative mt-1 text-2xl font-bold tracking-tight">{n.title}</h2>
        <p className="relative mt-3 text-[0.95rem] leading-relaxed text-zinc-600">{n.text}</p>
        {n.points && (
          <ul className="relative mt-4 space-y-2 rounded-2xl bg-zinc-100 px-4 py-3 text-left text-sm text-zinc-700">
            {n.points.map((p) => (
              <li key={p} className="flex gap-2"><span aria-hidden>{n.id.startsWith("bocal") ? "🍬" : "🎃"}</span><span>{p}</span></li>
            ))}
          </ul>
        )}
        <Link href={`/r/${roomId}/farm`} onClick={close} className="btn relative mt-5 w-full">{n.cta}</Link>
        <button onClick={close} className="relative mt-3 text-sm text-zinc-500">Fermer</button>
      </div>
    </div>
  );
}
