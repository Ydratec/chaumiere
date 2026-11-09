"use client";
/* eslint-disable @next/next/no-img-element -- images déjà optimisées (webp) */

import { imageOf, type Card, type Variant } from "./cards";
import { Shine } from "./tilt";

/** Retouche de l'image elle-même selon la version (le reste de l'effet est en CSS : .tcg-v-* et .tcg-fx-*). */
const FILTER: Record<Variant, string> = {
  rainbow: "saturate(1.15)",
};

// Gerbe de particules de la Légendaire alternative : directions et couleurs fixes (calculées une fois).
const COLORS = ["#ff5fa2", "#ffd84d", "#5dffb0", "#4dd2ff", "#b066ff", "#ffffff"];
const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2, d = 110 + (i % 3) * 35;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, color: COLORS[i % COLORS.length], delay: 350 + (i % 4) * 40 }; // partent avec l'onde de choc
});

/** Une carte : son image, le brillant de sa rareté, et l'effet de sa version alternative s'il y en a une.
 *  Une Légendaire en version alternative a un effet en plus (.tcg-v-legend) et, à chaque nouvelle valeur de `burst`,
 *  une animation : tour sur elle-même, flash, onde de choc et gerbe de particules. `still` : sans animation (petites cartes du classeur). */
export function CardArt({ card, variant, tilt, round = "rounded-2xl", glow, lazy, still, burst = 0 }: {
  card: Card; variant?: Variant; tilt?: { x: number; y: number }; round?: string; glow?: string; lazy?: boolean; still?: boolean; burst?: number;
}) {
  const legend = !!variant && card.rarity === "L";
  const boom = legend && !still && burst > 0;
  return (
    <div className="relative">
    {/* key : chaque nouveau `burst` relance l'animation (clés distinctes de celle du calque d'explosion, sinon React duplique la carte) */}
    <div key={boom ? `spin${burst}` : "still"} className={boom ? "tcg-burst-spin" : ""}>
    <div
      className={`relative ${round} ${variant ? `tcg-v-${variant}` : ""} ${legend ? "tcg-v-legend" : ""} ${still ? "tcg-still" : ""}`}
      style={{ boxShadow: variant ? undefined : glow }}
    >
      <img src={imageOf(card)} alt={card.name} loading={lazy ? "lazy" : undefined} draggable={false} className={`block w-full ${round}`} style={{ filter: variant ? FILTER[variant] : undefined }} />
      <Shine rarity={card.rarity} tilt={tilt} className={round} />
      {variant && (
        <div
          className={`tcg-fx-${variant} ${legend ? "tcg-fx-legend" : ""} pointer-events-none absolute inset-0 overflow-hidden ${round}`}
          style={tilt ? { backgroundPosition: `${50 + tilt.x * 50}% ${50 + tilt.y * 50}%` } : undefined}
        />
      )}
    </div>
    </div>
    {boom && (
      <div key={`boom${burst}`} className="pointer-events-none absolute inset-0 z-10">
        <div className={`tcg-burst-flash absolute inset-0 bg-white ${round}`} />
        <div className="tcg-burst-ring absolute left-1/2 top-1/2 size-24 rounded-full border-4 border-white" />
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="tcg-burst-dot absolute left-1/2 top-1/2 size-2.5 rounded-full"
            style={{ background: p.color, boxShadow: `0 0 8px ${p.color}`, animationDelay: `${p.delay}ms`, "--x": `${p.x}px`, "--y": `${p.y}px` } as React.CSSProperties}
          />
        ))}
      </div>
    )}
    </div>
  );
}
