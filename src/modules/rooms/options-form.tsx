"use client";

import { useState, useTransition } from "react";
import { setRoomOptions } from "./actions";

/** Options de la salle (admins) : enregistrées dès qu'on les change. */
export function RoomOptions({ roomId, voteLocked, questionHour }: { roomId: string; voteLocked: boolean; questionHour: number }) {
  const [locked, setLocked] = useState(voteLocked);
  const [hour, setHour] = useState(questionHour);
  const [, startTransition] = useTransition();
  const save = (l: boolean, h: number) => {
    setLocked(l);
    setHour(h);
    startTransition(() => setRoomOptions(roomId, { voteLocked: l, questionHour: h }));
  };
  return (
    <div className="rows">
      <label className="flex items-center justify-between gap-3 py-3 text-sm">
        <span>
          <span className="block font-medium">Réponses définitives</span>
          <span className="text-zinc-500">On ne peut plus changer son vote ni sa réponse.</span>
        </span>
        <input type="checkbox" checked={locked} onChange={() => save(!locked, hour)} className="size-5 accent-indigo-600" />
      </label>
      <label className="flex items-center justify-between gap-3 py-3 text-sm">
        <span className="font-medium">Nouvelle question chaque jour à</span>
        <select value={hour} onChange={(e) => save(locked, Number(e.target.value))} className="rounded-xl bg-white px-3 py-2 font-medium shadow-sm">
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h} h</option>)}
        </select>
      </label>
    </div>
  );
}
