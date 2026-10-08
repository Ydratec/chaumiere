"use client";

import { useState, useTransition } from "react";
import { giveGift } from "./actions";
import { ItemIcon } from "./art";

/** En visite : laisser une fleur à son ami (une fois par jour). */
export function GiftButton({ roomId, receiver, done, flowers }: { roomId: string; receiver: string; done: boolean; flowers: number }) {
  const [state, setState] = useState(done ? "Déjà offert aujourd'hui" : "");
  const [pending, startTransition] = useTransition();
  const sent = state === "Fleur offerte !";
  const blocked = !!state || !flowers;
  return (
    <button
      disabled={pending || blocked}
      onClick={() => startTransition(async () => setState((await giveGift(roomId, receiver)) || "Fleur offerte !"))}
      className={`btn w-full ${sent ? "bg-green-600 hover:bg-green-600 disabled:bg-green-600 disabled:text-white" : ""}`}
    >
      <ItemIcon id="flower" size={20} />
      {state || (flowers ? `Offrir une fleur (${flowers} en réserve)` : "Récolte une fleur d'abord")}
    </button>
  );
}
