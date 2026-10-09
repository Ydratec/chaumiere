"use client";

import { useOptimistic, useState } from "react";
import { useFormStatus } from "react-dom";
import { answer } from "@/app/actions";

function Submit({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn flex-1">{pending ? "Envoi…" : edit ? "Enregistrer" : "Envoyer"}</button>;
}

/**
 * Réponse à la question ouverte. Tant qu'on n'a pas répondu : un champ et « Envoyer ».
 * Ensuite : la réponse s'affiche tout de suite comme envoyée (✓), et on ne la modifie que par un bouton explicite
 * (sauf si la salle a choisi les réponses définitives).
 */
export function AnswerForm({ activityId, mine, locked }: { activityId: string; mine?: string; locked?: boolean }) {
  const [sent, setSent] = useOptimistic(mine);
  const [editing, setEditing] = useState(false);

  async function submit(f: FormData) {
    const content = String(f.get("content") ?? "").trim();
    if (!content) return;
    setEditing(false);
    setSent(content);
    await answer(f);
  }

  if (sent && !editing)
    return (
      <section className="space-y-2 rounded-3xl bg-white p-5 shadow-sm">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5 9-10" /></svg>
          Réponse envoyée
        </p>
        <p className="whitespace-pre-wrap leading-6 text-zinc-800">{sent}</p>
        {locked ? (
          <p className="pt-1 text-xs text-zinc-500">Réponse définitive dans cette salle.</p>
        ) : (
          <button onClick={() => setEditing(true)} className="pt-1 text-sm font-medium text-indigo-600">Modifier ma réponse</button>
        )}
      </section>
    );

  return (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="activity_id" value={activityId} />
      <textarea
        name="content"
        defaultValue={sent}
        rows={3}
        maxLength={500}
        required
        autoFocus={editing}
        placeholder="Ta réponse…"
        className="field resize-y bg-white shadow-sm"
      />
      <div className="flex gap-2">
        {editing && <button type="button" onClick={() => setEditing(false)} className="btn-soft">Annuler</button>}
        <Submit edit={editing} />
      </div>
    </form>
  );
}
