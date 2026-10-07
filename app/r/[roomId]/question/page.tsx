import { redirect } from "next/navigation";
import { registry, type Activity } from "@/src/modules/activities/registry";
import { Chat } from "@/src/modules/chat/chat";
import { getRoomContext } from "@/src/modules/rooms/context";

export default async function QuestionPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const { sb, user, names, people } = ctx;

  const { data: activity } = await sb.rpc("today_activity", { r: roomId }).single<Activity>();
  if (!activity) return <p>Aucune question disponible (base de questions vide ?).</p>;

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
      <Today activity={activity} userId={user.id} names={names} people={people} answers={answers ?? []} />
      <Chat
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
