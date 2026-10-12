"use client";

import { useEffect, useRef, useState } from "react";
import { ItemIcon } from "@/src/modules/farm/art";
import { claimTicket, type Card } from "./actions";
import { evaluate, PRIZES, RULES, TICKETS, winningCells, type Kind } from "./tickets";

/** Un lot, tel qu'il s'affiche dans une case : l'icône et le montant. */
function Face({ id, win }: { id: string; win?: boolean }) {
  const d = PRIZES[id].delta;
  const [item, n] = Object.entries(d)[0];
  const text = item === "coins" ? n.toLocaleString("fr-FR") : n > 1 ? `×${n}` : "";
  return (
    <span className={`flex size-full flex-col items-center justify-center gap-0.5 ${win ? "animate-pulse" : ""}`}>
      <ItemIcon id={item as never} size={item === "coins" ? 26 : 32} />
      {text && <span className={`font-bold tabular-nums leading-none ${text.length > 6 ? "text-[11px]" : "text-sm"}`}>{text}</span>}
    </span>
  );
}

/** Part grattée à partir de laquelle le reste se révèle tout seul (après une pause). */
const AUTO = 0.8;

const THEME: Record<Kind, string> = {
  small: "from-emerald-100 to-emerald-200 ring-emerald-300",
  medium: "from-amber-100 to-amber-200 ring-amber-300",
  big: "from-sky-100 to-indigo-200 ring-indigo-300",
};

/**
 * Un ticket à gratter : le contenu est dessous, une pellicule argentée (canvas) au-dessus qu'on efface au doigt.
 * Quand environ 80 % est gratté, on laisse un temps pour voir, puis le reste s'efface doucement (ou tout de suite avec « Tout révéler ») ;
 * le lot est versé une seule fois.
 */
export function ScratchCard({ roomId, card, onDone }: { roomId: string; card: Card; onDone: (prize: string | null) => void }) {
  const kind = card.kind as Kind;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const lastCheck = useRef(0);
  const won = evaluate(card.layout);
  const hits = revealed ? winningCells(card.layout) : [];

  // Pellicule argentée (dessinée une fois, à la taille réelle de l'écran).
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = c.getBoundingClientRect();
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, "#cfd4dc");
    grad.addColorStop(0.5, "#eef0f4");
    grad.addColorStop(1, "#b9bfca");
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "rgba(100,110,125,.35)";
    g.font = `bold ${14 * dpr}px system-ui, sans-serif`;
    g.textAlign = "center";
    for (let y = 22 * dpr; y < c.height; y += 34 * dpr)
      for (let x = (((y / dpr) | 0) % 2 ? 40 : 0) * dpr; x < c.width + 80 * dpr; x += 80 * dpr) g.fillText("GRATTE", x, y);
  }, []);

  const revealing = useRef(false);
  /** Révèle tout. `delay` : on laisse d'abord le temps de voir ce qu'on vient de gratter, puis le reste s'efface doucement. */
  function reveal(delay = 0) {
    if (revealing.current) return;
    revealing.current = true;
    setTimeout(() => {
      setRevealed(true);
      try {
        navigator.vibrate?.(won ? [60, 40, 60] : 20);
      } catch {}
      void claimTicket(roomId, card.id).then(() => setTimeout(() => onDone(won), 1200)); // le message arrive une fois le ticket bien visible
    }, delay);
  }

  /** Part de la pellicule déjà effacée (on échantillonne un pixel sur quelques-uns). */
  function cleared() {
    const c = canvas.current!;
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let total = 0, clear = 0;
    for (let i = 3; i < data.length; i += 4 * 37) {
      total++;
      if (data[i] < 128) clear++;
    }
    return clear / total;
  }

  function scratch(e: React.PointerEvent<HTMLCanvasElement>) {
    if (revealed || !(e.buttons || e.pointerType === "touch")) return;
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    const dpr = c.width / r.width;
    const p = { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
    const g = c.getContext("2d")!;
    g.globalCompositeOperation = "destination-out";
    g.lineCap = g.lineJoin = "round";
    g.lineWidth = 34 * dpr;
    g.beginPath();
    g.moveTo((last.current ?? p).x, (last.current ?? p).y);
    g.lineTo(p.x, p.y);
    g.stroke();
    last.current = p;
    if (e.timeStamp - lastCheck.current > 250) {
      lastCheck.current = e.timeStamp;
      if (cleared() > AUTO) reveal(1500);
    }
  }

  const l = card.layout;
  const cell = (i: number, id: string) => (
    <div key={i} className={`flex aspect-square items-center justify-center rounded-xl bg-white/80 text-zinc-800 ${hits.includes(i) ? "ring-4 ring-amber-400" : ""}`}>
      <Face id={id} win={hits.includes(i)} />
    </div>
  );

  return (
    <div className={`space-y-3 rounded-[1.75rem] bg-gradient-to-br p-4 shadow-lg ring-2 ${THEME[kind]}`}>
      <div className="text-center">
        <p className="eyebrow text-zinc-600">Ticket {TICKETS[kind].name} · {RULES[l.rule].name}</p>
        <p className="text-xs text-zinc-600">{RULES[l.rule].text}</p>
      </div>
      <div className="relative select-none overflow-hidden rounded-2xl" data-no-swipe style={{ touchAction: "none" }}>
        <div className="p-2">
          {l.rule === "number" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm font-semibold text-zinc-600">Numéro gagnant</span>
                <span className="flex size-12 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold text-white">{l.win}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {l.entries.map((e, i) => (
                  <div key={i} className={`space-y-1 rounded-xl bg-white/80 p-2 text-center text-zinc-800 ${hits.includes(i) ? "ring-4 ring-amber-400" : ""}`}>
                    <span className="mx-auto flex size-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold">{e.n}</span>
                    <div className="aspect-[4/3]"><Face id={e.p} win={hits.includes(i)} /></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">{l.cells.map((id, i) => cell(i, id))}</div>
          )}
        </div>
        <canvas
          ref={canvas}
          aria-label="Pellicule à gratter"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); last.current = null; scratch(e); }}
          onPointerMove={scratch}
          onPointerUp={() => { last.current = null; if (!revealed && cleared() > AUTO) reveal(1500); }}
          className={`absolute inset-0 size-full cursor-crosshair transition-opacity duration-[1800ms] ${revealed ? "pointer-events-none opacity-0" : ""}`}
        />
      </div>
      {!revealed && <button onClick={() => reveal()} className="w-full text-center text-xs font-medium text-zinc-500">Tout révéler</button>}
    </div>
  );
}
