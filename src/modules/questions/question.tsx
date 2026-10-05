import { answer } from "@/app/actions";
import type { ActivityProps } from "../activities/registry";

export function QuestionActivity({ activity, userId, names, answers }: ActivityProps) {
  const mine = answers.find((a) => a.user_id === userId);
  const others = answers.filter((a) => a.user_id !== userId);
  return (
    <>
      <section className="rounded-3xl bg-indigo-600 p-5 text-white">
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">Question du jour</span>
        <h2 className="mt-5 text-2xl font-bold leading-tight">{activity.payload.text}</h2>
        <p className="mt-3 text-sm leading-6 text-indigo-100">
          Réponds, puis découvre ce que tes amis ont partagé.
        </p>
      </section>

      <form action={answer} className="space-y-3 rounded-3xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-bold">Ta réponse</h3>
        <input type="hidden" name="activity_id" value={activity.id} />
        <textarea
          name="content"
          defaultValue={mine?.content}
          rows={4}
          maxLength={500}
          required
          placeholder="Écris ta réponse ici…"
          className="w-full resize-y rounded-2xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
        <button className="min-h-11 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700">
          {mine ? "Modifier" : "Envoyer"}
        </button>
      </form>

      {mine && (
        <section>
          <h3 className="mb-3 text-lg font-bold">Les réponses des amis</h3>
          {others.length === 0 && <p className="text-sm text-zinc-500">Personne d’autre n’a répondu pour l’instant.</p>}
          <div className="space-y-3">
            {others.map((a) => (
              <article key={a.user_id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="font-semibold">{names[a.user_id]}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{a.content}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
