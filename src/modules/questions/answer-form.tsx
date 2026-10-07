"use client";

import { useFormStatus } from "react-dom";
import { answer } from "@/app/actions";

function Submit({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn">{pending ? "Envoi…" : edit ? "Modifier ma réponse" : "Envoyer"}</button>;
}

/** Réponse à la question ouverte : le bouton réagit tout de suite pendant l'envoi. */
export function AnswerForm({ activityId, mine }: { activityId: string; mine?: string }) {
  return (
    <form action={answer} className="space-y-3">
      <input type="hidden" name="activity_id" value={activityId} />
      <textarea
        name="content"
        defaultValue={mine}
        rows={3}
        maxLength={500}
        required
        placeholder="Ta réponse…"
        className="field resize-y bg-white shadow-sm"
      />
      <Submit edit={!!mine} />
    </form>
  );
}
