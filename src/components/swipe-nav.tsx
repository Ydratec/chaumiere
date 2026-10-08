"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { roomTabs } from "./tab-bar";

/** Le geste part-il d'une zone qui défile horizontalement (rangée d'avatars, réserve…) ? Elle a priorité. */
function inScroller(el: HTMLElement | null) {
  for (; el && el !== document.body; el = el.parentElement) {
    const o = getComputedStyle(el).overflowX;
    if ((o === "auto" || o === "scroll") && el.scrollWidth > el.clientWidth) return true;
  }
  return false;
}

const EDGE = 24; // zone du bord de l'écran réservée au geste « retour » du système
const MIN_DX = 50;

/**
 * Balayer gauche/droite change d'onglet. Les balayages partant des bords sont neutralisés
 * pour éviter le retour/avance de page du navigateur, qui fait sortir de l'app par accident.
 */
export function SwipeNav({ roomId, isAdmin }: { roomId: string; isAdmin: boolean }) {
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    const tabs = roomTabs(roomId, isAdmin);
    const i = tabs.findIndex((t) => t.href === path); // pas de swipe sur les sous-pages (ex. partie en cours)
    let x0 = 0, y0 = 0, ignore = false, done = false;
    // Précharge les onglets voisins : le balayage n'attend plus le réseau.
    [tabs[i - 1], tabs[i + 1]].forEach((t) => t && router.prefetch(t.href));

    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      x0 = t.clientX; y0 = t.clientY;
      done = false;
      ignore = !!(e.target as HTMLElement).closest("input, textarea, select, [data-no-swipe]") || inScroller(e.target as HTMLElement);
      if (x0 < EDGE || x0 > window.innerWidth - EDGE) e.preventDefault(); // bloque le geste retour/avance du système
    };
    // On navigue dès que le seuil est franchi, sans attendre que le doigt se lève.
    const move = (e: TouchEvent) => {
      if (done || ignore || i < 0 || x0 < EDGE || x0 > window.innerWidth - EDGE) return;
      const t = e.touches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      done = true;
      const next = tabs[i + (dx < 0 ? 1 : -1)];
      if (next) router.push(next.href);
    };

    window.addEventListener("touchstart", start, { passive: false });
    window.addEventListener("touchmove", move, { passive: true });
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
    };
  }, [roomId, isAdmin, path, router]);

  return null;
}
