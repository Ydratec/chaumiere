"use client";

import { useState } from "react";
import { setHue as saveHue } from "@/app/actions";

const HUES = [250, 215, 175, 140, 45, 20, 345, 300];
const EXTRA = [195, 100, 65, 0]; // débloquées par le projet de ferme « cosmetic:hues »

/** Couleur perso (tons clairs : onglet actif, choix sélectionnés) propre à chaque personne : cookie posé par une server action (lu par le layout racine). */
export function ThemePicker({ current, extra = false }: { current: number; extra?: boolean }) {
  const [hue, setHue] = useState(current);
  function pick(h: number) {
    setHue(h);
    document.documentElement.style.setProperty("--h", String(h));
    void saveHue(h);
  }
  return (
    <div className="flex flex-wrap gap-3">
      {(extra ? [...HUES, ...EXTRA] : HUES).map((h) => (
        <button
          key={h}
          type="button"
          aria-label={`Teinte ${h}`}
          aria-pressed={hue === h}
          onClick={() => pick(h)}
          style={{ background: `hsl(${h} 72% 80%)` }}
          className={`cut size-10 rounded-full border-2 border-ink ${hue === h ? "-rotate-6 scale-110 ring-[3px] ring-ink ring-offset-2 ring-offset-white" : ""}`}
        />
      ))}
    </div>
  );
}
