import Link from "next/link";
import { redirect } from "next/navigation";
import { registry, type Activity } from "@/src/modules/activities/registry";
import { Chat } from "@/src/modules/chat/chat";
import { todayExtras } from "@/src/modules/questions/extras";
import { getRoomContext } from "@/src/modules/rooms/context";

export default async function QuestionPage({ params, searchParams }: { params: Promise<{ roomId: string }>; searchParams: Promise<{ a?: string }> }) {
  const [{ roomId }, { a }] = await Promise.all([params, searchParams]);
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const { sb, user, names, people } = ctx;

  const { data: main } = await sb.rpc("today_activity", { r: roomId }).single<Activity>();
  if (!main) return <p>Aucune question disponible (base de questions vide ?).</p>;
  const extras = await todayExtras(sb, main);
  // ?a=… : une question achetée (du jour ou d'un jour passé, tant qu'elle est de cette salle).
  const picked = a && a !== main.id
    ? (extras.find((x) => x.id === a) ?? (await sb.from("daily_activities").select("*").eq("id", a).eq("room_id", roomId).maybeSingle<Activity>()).data)
    : null;
  const activity = picked ?? main;

  const [{ data: answers }, { data: messages }] = await Promise.all([
    sb.from("answers").select("user_id, content").eq("activity_id", activity.id),
    sb.from("messages").select("id, user_id, content").eq("activity_id", activity.id).order("id"),
  ]);
  const ids = (messages ?? []).map((m) => m.id);
  const { data: reactions } = ids.length
    ? await sb.from("message_reactions").select("message_id, user_id, emoji").in("message_id", ids)
    : { data: [] };
  const Today = registry[activity.type];

  return (
    <>
      {extras.length > 0 && (
        <nav data-no-swipe className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {[main, ...extras].map((x, i) => (
            <Link
              key={x.id}
              href={i ? `/r/${roomId}/question?a=${x.id}` : `/r/${roomId}/question`}
              aria-current={x.id === activity.id ? "page" : undefined}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${x.id === activity.id ? "bg-indigo-600 text-white" : "bg-white text-zinc-600 shadow-sm"}`}
            >
              {i ? `Question ${i + 1}` : "Du jour"}
            </Link>
          ))}
        </nav>
      )}
      <Today key={activity.id} activity={activity} userId={user.id} names={names} people={people} voteLocked={ctx.voteLocked} answers={answers ?? []} />
      <Chat
        key={`chat-${activity.id}`}
        activityId={activity.id}
        userId={user.id}
        names={names}
        people={people}
        initial={messages ?? []}
        initialReactions={reactions ?? []}
      />
    </>
  );
}
