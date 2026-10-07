"use client";

import { useActionState, useState } from "react";
import { createRoom, joinRoom } from "./actions";

/** Rejoindre avec un code, ou créer sa salle : dans les deux cas on choisit son pseudo dans cette salle. */
export function JoinForms() {
  const [mode, setMode] = useState<"join" | "create">("join");
  const [joinErr, join, joining] = useActionState(joinRoom, "");
  const [createErr, create, creating] = useActionState(createRoom, "");
  const err = mode === "join" ? joinErr : createErr;
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-zinc-200/60 p-1 text-sm font-medium">
        {(["join", "create"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full py-2 transition ${mode === m ? "bg-white shadow-sm" : "text-zinc-500"}`}>
            {m === "join" ? "Rejoindre une salle" : "Créer une salle"}
          </button>
        ))}
      </div>
      <form key={mode} action={mode === "join" ? join : create} className="animate-pop space-y-3">
        {mode === "join" ? (
          <input name="code" placeholder="Code de la salle" required autoCapitalize="none" className="field bg-white shadow-sm" />
        ) : (
          <input name="name" placeholder="Nom de la salle" required className="field bg-white shadow-sm" />
        )}
        <input name="username" placeholder="Ton pseudo dans cette salle" required className="field bg-white shadow-sm" />
        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
        <button disabled={joining || creating} className="btn w-full">{mode === "join" ? "Rejoindre" : "Créer la salle"}</button>
      </form>
    </section>
  );
}
