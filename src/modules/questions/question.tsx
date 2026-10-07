import { answer } from "@/app/actions";
import type { ActivityProps } from "../activities/registry";
import { VoteActivity } from "./vote";

export function QuestionActivity(props: ActivityProps) {
  if (props.activity.payload.kind === "vote") return <VoteActivity {...props} />;
  const { activity, userId, names, answers } = props;
  const mine = answers.find((a) => a.user_id === userId);
  const others = answers.filter((a) => a.user_id !== userId);
  return (
    <>
      <section className="pt-2">
        <p className="eyebrow">Question du jour</p>
        <h2 className="mt-2 text-[1.7rem] font-bold leading-tight tracking-tight">{activity.payload.text}</h2>
      </section>

      <form action={answer} className="space-y-3">
        <input type="hidden" name="activity_id" value={activity.id} />
        <textarea
          name="content"
          defaultValue={mine?.content}
          rows={3}
          maxLength={500}
          required
          placeholder="Ta réponse…"
          className="field resize-y bg-white shadow-sm"
        />
        <button className="btn">{mine ? "Modifier ma réponse" : "Envoyer"}</button>
      </form>

      {mine && (
        <section>
          <h3 className="eyebrow mb-1">Les réponses des amis</h3>
          {others.length === 0 && <p className="py-3 text-sm text-zinc-500">Personne d’autre n’a répondu pour l’instant.</p>}
          <div className="rows">
            {others.map((a) => (
              <article key={a.user_id} className="py-3">
                <p className="text-sm font-semibold">{names[a.user_id]}</p>
                <p className="mt-0.5 whitespace-pre-wrap leading-6 text-zinc-700">{a.content}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
