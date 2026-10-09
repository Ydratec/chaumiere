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
 * Ensuite, la réponse prend sa place dans la liste, comme celles des amis (avec une coche « envoyée »), et un lien permet de la modifier
 * (sauf si la salle a choisi les réponses définitives). Les réponses des amis (`children`) ne se montrent qu'après avoir répondu.
 */
export function AnswerForm({ activityId, name, mine, locked, children }: { activityId: string; name: string; mine?: string; locked?: boolean; children?: React.ReactNode }) {
  const [sent, setSent] = useOptimistic(mine);
  const [editing, setEditing] = useState(false);

  async function submit(f: FormData) {
    const content = String(f.get("content") ?? "").trim();
    if (!content) return;
    setEditing(false);
    setSent(content);
    await answer(f);
  }

  const form = (
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

  if (!sent) return form;
  return (
    <>
      {editing && form}
      <section>
        <h3 className="eyebrow mb-1">Les réponses</h3>
        <div className="rows">
          {!editing && (
            <article className="py-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {name}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5 9-10" /></svg>
                  envoyée
                </span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap leading-6 text-zinc-700">{sent}</p>
              {!locked && <button onClick={() => setEditing(true)} className="mt-1 text-sm font-medium text-indigo-600">Modifier</button>}
            </article>
          )}
          {children}
        </div>
      </section>
    </>
  );
}
