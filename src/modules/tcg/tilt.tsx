"use client";

import { useRef, useState } from "react";
import { RARITIES, type Rarity } from "./cards";

export const TILT = 22; // inclinaison maximale (degrés)

/** Reflet de lumière : suit l'inclinaison (-1..1), invisible au repos. */
export function Glare({ tilt, className }: { tilt: { x: number; y: number }; className: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 mix-blend-overlay transition-opacity duration-300 ${className}`}
      style={{ opacity: tilt.x || tilt.y ? 1 : 0, background: `radial-gradient(circle at ${(1 - tilt.x) * 50}% ${(1 - tilt.y) * 50}%, rgba(255,255,255,.55), transparent 55%)` }}
    />
  );
}

/** Brillant d'une carte selon sa rareté : reflet qui balaie, et holographique pour les plus rares (suit `tilt` si donné). */
export function Shine({ rarity, tilt, className }: { rarity: Rarity; tilt?: { x: number; y: number }; className: string }) {
  const { shine, holo } = RARITIES[rarity];
  return (
    <>
      {shine > 0 && <div className={`tcg-shine pointer-events-none absolute inset-0 ${className}`} style={{ opacity: shine }} />}
      {holo > 0 && (
        <div
          className={`tcg-holo pointer-events-none absolute inset-0 ${tilt ? "" : "tcg-holo-move"} ${className}`}
          style={{ opacity: holo, backgroundPosition: tilt ? `${50 + tilt.x * 50}% ${50 + tilt.y * 50}%` : undefined }}
        />
      )}
    </>
  );
}

/** Carte qui s'incline en 3D sous le doigt, avec reflet et ombre ; revient en place quand on lâche.
 *  `children` reçoit l'inclinaison pendant qu'on la tient (pour les effets qui la suivent). */
export function TiltCard({ children, onTap, className = "" }: {
  children: (tilt?: { x: number; y: number }) => React.ReactNode; onTap?: () => void; className?: string;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const press = useRef({ x: 0, y: 0, t: 0 }); // pour reconnaître un simple toucher
  const to = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect(), c = (v: number) => Math.max(-1, Math.min(1, v));
    setTilt({ x: c(((e.clientX - r.left) / r.width - 0.5) * 2), y: c(((e.clientY - r.top) / r.height - 0.5) * 2) });
  };
  const release = (e: React.PointerEvent) => {
    setHeld(false);
    setTilt({ x: 0, y: 0 });
    const p = press.current;
    if (onTap && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8 && e.timeStamp - p.t < 350) onTap();
  };
  return (
    <div
      ref={box}
      className={`touch-none select-none ${className}`}
      style={{ perspective: "900px" }}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); press.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }; setHeld(true); to(e); }}
      onPointerMove={(e) => held && to(e)}
      onPointerUp={release}
      onPointerCancel={() => { setHeld(false); setTilt({ x: 0, y: 0 }); }}
    >
      <div
        className={`relative rounded-2xl ${held ? "transition-transform duration-75" : "transition-transform duration-500 ease-out"}`}
        style={{ transform: `rotateY(${tilt.x * TILT}deg) rotateX(${-tilt.y * TILT}deg)`, boxShadow: `${-tilt.x * 24}px ${24 - tilt.y * 12}px 48px rgba(0,0,0,.6)` }}
      >
        {children(held ? tilt : undefined)}
        <Glare tilt={tilt} className="rounded-2xl" />
      </div>
    </div>
  );
}
