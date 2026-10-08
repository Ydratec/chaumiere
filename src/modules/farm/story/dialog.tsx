"use client";

import { useState } from "react";
import { foundSecret } from "./actions";
import { NPCS } from "./ch1";
import { NpcPortrait } from "./npc-art";
import type { Line } from "./types";

/**
 * Petite scène : un portrait, une réplique à la fois, on touche pour avancer.
 * Toucher cinq fois de suite le portrait de Mirabelle chatouille un fantôme… (secret).
 */
export function Dialog({ roomId, lines, onDone }: { roomId: string; lines: Line[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [tickles, setTickles] = useState(0);
  const [giggle, setGiggle] = useState("");
  const line = lines[i];
  const npc = NPCS[line.who];
  const last = i === lines.length - 1;

  function tickle() {
    if (line.who !== "mirabelle") return;
    const n = tickles + 1;
    setTickles(n);
    setGiggle(n >= 5 ? "Hihihi ! Arrête, ça chatouille !" : "");
    if (n === 5) void foundSecret(roomId, "fantome").then((m) => m && setGiggle(m));
  }

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col justify-end" role="dialog" aria-label={`${npc.name} parle`}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative mx-auto w-full max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={tickle} aria-label={npc.name} className="relative z-10 -mb-5 ml-3 flex size-20 items-center justify-center rounded-3xl bg-white shadow-lg ring-4 ring-white/80 transition active:scale-95">
          <NpcPortrait who={line.who} size={64} />
        </button>
        <button type="button" onClick={() => (last ? onDone() : setI(i + 1))} className="relative block w-full rounded-[1.75rem] bg-white p-5 pt-8 text-left shadow-xl">
          <span className="eyebrow">{npc.name} <span className="font-normal normal-case tracking-normal text-zinc-400">· {npc.role}</span></span>
          <span className="mt-2 block text-[1.05rem] font-medium leading-relaxed">{line.text}</span>
          {giggle && <span className="mt-2 block text-sm font-semibold text-amber-700">{giggle}</span>}
          <span className="mt-3 flex items-center justify-between text-xs text-zinc-400">
            <span>{i + 1} / {lines.length}</span>
            <span className="font-semibold text-indigo-600">{last ? "Fermer" : "Suite ›"}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
