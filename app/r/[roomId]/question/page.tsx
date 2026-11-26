import Link from "next/link";
import { redirect } from "next/navigation";
import { registry, type Activity } from "@/src/modules/activities/registry";
import { Chat } from "@/src/modules/chat/chat";
import { adminDb } from "@/src/lib/db/server";
import { todayExtras } from "@/src/modules/questions/extras";
import { InverseOffer } from "@/src/modules/questions/inverse";
import { QuestionHistory } from "@/src/modules/questions/history";
import { getRoomContext } from "@/src/modules/rooms/context";

export default async function QuestionPage({ params, searchParams }: { params: Promise<{ roomId: string }>; searchParams: Promise<{ a?: string }> }) {
  const [{ roomId }, { a }] = await Promise.all([params, searchParams]);
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const { sb, user, names, people } = ctx;

  const { data: main } = await sb.rpc("today_activity", { r: roomId }).single<Activity>();
  if (!main) return <p>Aucune question disponible (base de questions vide ?).</p>;
  const all = await todayExtras(sb, main);
  // Les questions inverses s'affichent sous leur originale (même onglet, même discussion), pas dans les onglets.
  const extras = all.filter((x) => !x.payload.inverse_of);
  const find = async (id: string) =>
    [main, ...all].find((x) => x.id === id) ?? (await sb.from("daily_activities").select("*").eq("id", id).eq("room_id", roomId).maybeSingle<Activity>()).data;
  // ?a=… : une question achetée (du jour ou d'un jour passé, tant qu'elle est de cette salle) ; une inverse ouvre son originale.
  let picked = a && a !== main.id ? await find(a) : null;
  if (picked?.payload.inverse_of) picked = await find(picked.payload.inverse_of);
  const activity = picked ?? main;

  const [{ data: answers }, { data: messages }, { data: inverse }, { data: wallet }, { data: source }] = await Promise.all([
    sb.from("answers").select("user_id, content").eq("activity_id", activity.id),
    sb.from("messages").select("id, user_id, content").eq("activity_id", activity.id).order("id"),
    sb.from("daily_activities").select("*").eq("room_id", roomId).eq("payload->>inverse_of", activity.id).maybeSingle<Activity>(),
    adminDb().from("farm_items").select("qty").eq("room_id", roomId).eq("user_id", user.id).eq("item", "coins").maybeSingle(),
    // L'inverse possible (choisie d'avance, migration 0040) : seulement pour les questions de la base.
    activity.payload.qid ? adminDb().from("questions").select("inverse").eq("id", activity.payload.qid).maybeSingle<{ inverse: string | null }>() : { data: null },
  ]);
  const { data: inverseAnswers } = inverse ? await sb.from("answers").select("user_id, content").eq("activity_id", inverse.id) : { data: [] };
  const invertible = !inverse && activity.day === main.day && !activity.payload.inverse_of && !!source?.inverse;
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
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${x.id === activity.id ? "bg-indigo-600 text-white" : "sticker text-zinc-600"}`}
            >
              {i ? `Question ${i + 1}` : "Du jour"}
            </Link>
          ))}
        </nav>
      )}
      <Today key={activity.id} activity={activity} userId={user.id} names={names} people={people} voteLocked={ctx.voteLocked} answers={answers ?? []} />
      {inverse && (
        <div className="space-y-4 border-t-2 border-dashed border-zinc-300 pt-4">
          <Today key={inverse.id} activity={inverse} userId={user.id} names={names} people={people} voteLocked={ctx.voteLocked} answers={inverseAnswers ?? []} />
        </div>
      )}
      {invertible && <InverseOffer roomId={roomId} activityId={activity.id} inverse={source!.inverse!} coins={wallet?.qty ?? 0} />}
      {!(answers ?? []).some((x) => x.user_id === user.id) ? (
        <p className="rounded-2xl sticker px-4 py-5 text-center text-sm text-zinc-500">
          {activity.payload.kind === "open" || !activity.payload.kind ? "Réponds" : activity.payload.kind === "rank" ? "Fais ton classement" : "Vote"} pour voir la discussion.
        </p>
      ) : (
      <Chat
        key={`chat-${activity.id}`}
        activityId={activity.id}
        userId={user.id}
        names={names}
        people={people}
        initial={messages ?? []}
        initialReactions={reactions ?? []}
      />
      )}
      {activity.id === main.id && <QuestionHistory sb={sb} roomId={roomId} today={main.day!} names={names} people={people} />}
    </>
  );
}
