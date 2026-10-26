// Historique : les questions des deux jours précédents, avec les réponses (et le résultat des votes).
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity, Answer } from "../activities/registry";
import type { Person } from "../rooms/context";
import { tally } from "./tally";

const shift = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const label = (day: string, today: string) =>
  day === shift(today, -1) ? "Hier" : day === shift(today, -2) ? "Avant-hier"
    : new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(Date.parse(`${day}T12:00:00Z`));

export async function QuestionHistory({ sb, roomId, today, names, people }: {
  sb: SupabaseClient;
  roomId: string;
  today: string; // jour de la question du jour
  names: Record<string, string>;
  people: Record<string, Person>;
}) {
  const days = [shift(today, -1), shift(today, -2)];
  const { data: acts } = await sb.from("daily_activities").select("*").eq("room_id", roomId).eq("type", "question").in("day", days)
    .order("day", { ascending: false }).order("slot").returns<Activity[]>();
  if (!acts?.length) return null;
  const { data: rows } = await sb.from("answers").select("activity_id, user_id, content").in("activity_id", acts.map((a) => a.id));
  const answersOf = (id: string) => (rows ?? []).filter((r) => r.activity_id === id) as (Answer & { activity_id: string })[];
  const members = Object.entries(people).map(([id, p]) => ({ id, name: p.name }));

  return (
    <section className="space-y-4">
      <h2 className="eyebrow">Les jours précédents</h2>
      {days.map((day) => {
        const list = acts.filter((a) => a.day === day);
        if (!list.length) return null;
        return (
          <div key={day} className="space-y-3">
            <p className="text-sm font-semibold capitalize text-zinc-500">{label(day, today)}</p>
            {list.map((a) => {
              const answers = answersOf(a.id);
              const vote = a.payload.kind === "vote";
              const t = vote ? tally(answers, members) : null;
              return (
                <article key={a.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                  <h3 className="font-bold leading-snug">{a.payload.text}</h3>
                  {vote ? (
                    t!.total ? (
                      <ol className="mt-2 space-y-1 text-sm">
                        {t!.rows.filter((r) => r.voters.length).slice(0, 3).map((r, i) => (
                          <li key={r.id} className="flex justify-between gap-3">
                            <span>{["🥇", "🥈", "🥉"][i]} {r.name}</span>
                            <span className="tabular-nums text-zinc-500">{r.voters.length} voix</span>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="mt-2 text-sm text-zinc-500">Personne n&apos;a voté.</p>
                  ) : answers.length ? (
                    <div className="rows mt-1">
                      {answers.map((x) => (
                        <p key={x.user_id} className="py-2 text-sm">
                          <span className="font-semibold">{names[x.user_id] ?? "?"}</span>
                          <span className="mt-0.5 block whitespace-pre-wrap leading-6 text-zinc-700">{x.content}</span>
                        </p>
                      ))}
                    </div>
                  ) : <p className="mt-2 text-sm text-zinc-500">Personne n&apos;a répondu.</p>}
                  <Link href={`/r/${roomId}/question?a=${a.id}`} className="mt-2 inline-block text-sm font-semibold text-indigo-600">Voir la discussion ›</Link>
                </article>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
