"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Rafraîchissement de la page serveur, économe : regroupe les rafales (un seul rafraîchissement par `wait` ms)
 * et attend que l'app soit au premier plan (un onglet caché ne recharge rien ; il se met à jour en revenant).
 * Chaque rafraîchissement coûte un rendu serveur : c'est ce qui consomme le temps de calcul de l'hébergement.
 */
export function useSoftRefresh(wait = 1500) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === "visible" && dirty.current) {
        dirty.current = false;
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);
  return () => {
    if (timer.current) return; // déjà prévu
    timer.current = setTimeout(() => {
      timer.current = null;
      if (document.visibilityState === "visible") router.refresh();
      else dirty.current = true;
    }, wait);
  };
}
