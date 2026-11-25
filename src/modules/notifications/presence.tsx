"use client";
// Signale que l'appli est ouverte (au démarrage, au retour sur l'appli, puis chaque minute tant qu'elle est visible) :
// ça remet à zéro les limites des notifications « salle » et évite les notifications « à toi de jouer » inutiles.
import { useEffect } from "react";
import { markSeen } from "./actions";

export function Presence() {
  useEffect(() => {
    const ping = () => { if (document.visibilityState === "visible") markSeen().catch(() => {}); };
    ping();
    document.addEventListener("visibilitychange", ping);
    const t = setInterval(ping, 60_000);
    return () => { document.removeEventListener("visibilitychange", ping); clearInterval(t); };
  }, []);
  return null;
}
