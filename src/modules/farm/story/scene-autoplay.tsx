"use client";

import { useState, useSyncExternalStore } from "react";
import { ScenePlayer, type Stage } from "./scene-player";
import type { Step } from "./types";

const noop = () => () => {};
const flag = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true; // stockage indisponible : on ne rejoue pas la scène à chaque visite
  }
};

/** Joue la scène d'ouverture de la quête en cours en arrivant dans sa serre, une fois par appareil. */
export function SceneAutoplay({ roomId, quest, stage }: { roomId: string; quest: { id: string; title: string; steps: Step[] } | null; stage: Stage }) {
  const key = quest ? `scene:${roomId}:${quest.id}:intro` : "";
  const seen = useSyncExternalStore(noop, () => !key || flag(key), () => true); // true côté serveur : rien à l'hydratation
  const [closed, setClosed] = useState(false);
  if (!quest || seen || closed) return null;
  const done = () => {
    setClosed(true);
    try {
      localStorage.setItem(key, "1");
    } catch {}
  };
  return <ScenePlayer steps={quest.steps} title={quest.title} stage={stage} onDone={done} />;
}
