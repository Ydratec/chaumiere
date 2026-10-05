import { db } from "@/src/lib/db/server";
import { registry, type Activity } from "@/src/modules/activities/registry";
import { Chat } from "@/src/modules/chat/chat";
import { logout } from "./actions";
import { LoginForm } from "./login-form";

export default async function Home() {
  const sb = await db();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return <LoginForm />;

  const { data: me } = await sb
    .from("room_members")
    .select("room_id, rooms(name)")
    .eq("user_id", user.id)
    .single<{ room_id: string; rooms: { name: string } }>();
  if (!me) return <LoginForm />;

  const [{ data: members }, { data: activity }] = await Promise.all([
    sb.from("room_members").select("user_id, username").eq("room_id", me.room_id),
    sb.rpc("today_activity", { r: me.room_id }).single<Activity>(),
  ]);
  if (!activity) return <p className="p-8">Aucune question disponible (base de questions vide ?).</p>;

  const [{ data: answers }, { data: messages }] = await Promise.all([
    sb.from("answers").select("user_id, content").eq("activity_id", activity.id),
    sb.from("messages").select("id, user_id, content").eq("activity_id", activity.id).order("id"),
  ]);
  const names = Object.fromEntries((members ?? []).map((m) => [m.user_id, m.username]));
  const Today = registry[activity.type];

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Ta salle</p>
            <h1 className="text-lg font-bold">{me.rooms?.name}</h1>
          </div>
          <form action={logout}>
            <button className="rounded-full border border-zinc-200 px-3 py-2 text-sm font-medium">Quitter</button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-md space-y-5 px-4 py-5">
        <Today activity={activity} userId={user.id} names={names} answers={answers ?? []} />
        <Chat activityId={activity.id} userId={user.id} names={names} initial={messages ?? []} />
      </div>
    </main>
  );
}
