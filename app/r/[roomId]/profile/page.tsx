import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ThemePicker } from "@/src/components/theme-picker";
import { isSuperAdmin } from "@/src/modules/admin/guard";
import { loadOwnedSkins } from "@/src/modules/characters/data";
import { CharacterEditor } from "@/src/modules/characters/editor";
import { FeedbackForms } from "@/src/modules/feedback/forms";
import { NotificationSettings } from "@/src/modules/notifications/settings";
import { adminDb } from "@/src/lib/db/server";
import { loadUnlocks } from "@/src/modules/farm/data";
import { Avatar } from "@/src/components/avatar";
import { logout } from "@/app/actions";
import { leaveRoom } from "@/src/modules/rooms/actions";
import { AvatarForm } from "@/src/modules/rooms/avatar-form";
import { getRoomContext } from "@/src/modules/rooms/context";

export default async function ProfilePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const hue = Number((await cookies()).get("hue")?.value) || 250;
  const me = ctx.members.find((m) => m.user_id === ctx.user.id)!;
  const others = ctx.members.filter((m) => m !== me);
  const [owned, unlocks, { data: wallet }, { data: np }] = await Promise.all([
    loadOwnedSkins(roomId, ctx.user.id),
    loadUnlocks(roomId),
    adminDb().from("farm_items").select("qty").eq("room_id", roomId).eq("user_id", ctx.user.id).eq("item", "coins").maybeSingle(),
    adminDb().from("notification_prefs").select("question, games, chat, farm").eq("user_id", ctx.user.id).maybeSingle(),
  ]);
  const coins = wallet?.qty ?? 0;
  const canLeave = !others.length || !ctx.isAdmin || others.some((m) => m.role === "admin");

  return (
    <>
      <section className="flex flex-col items-center gap-3 pt-4 text-center">
        <Avatar url={me.avatar_url} character={me.character} name={me.username} size={96} />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{me.username}</h2>
        </div>
        <AvatarForm roomId={roomId} target="user" />
      </section>

      <section>
        <h2 className="eyebrow mb-3">Mon personnage</h2>
        <CharacterEditor roomId={roomId} saved={me.character} owned={owned} unlocks={unlocks} coins={coins} />
      </section>

      <FeedbackForms roomId={roomId} coins={coins} />

      <section>
        <h2 className="eyebrow mb-3">Notifications</h2>
        <NotificationSettings initial={np ?? { question: true, games: true, chat: true, farm: true }} />
      </section>

      <section>
        <h2 className="eyebrow mb-3">Couleur de l&apos;app</h2>
        <ThemePicker current={hue} extra={unlocks.includes("cosmetic:hues")} />
      </section>

      <section className="rows">
        {isSuperAdmin(ctx.user) && (
          <Link href={`/r/${roomId}/admin`} className="block py-3 font-medium text-indigo-600">Mode admin</Link>
        )}
        {canLeave ? (
          <form action={leaveRoom}>
            <input type="hidden" name="room_id" value={roomId} />
            <button className="w-full py-3 text-left font-medium text-red-600">Quitter cette salle</button>
          </form>
        ) : (
          <p className="py-3 text-sm text-zinc-500">Tu es le seul admin : nomme un autre admin avant de pouvoir quitter la salle.</p>
        )}
        <form action={logout}>
          <button className="w-full py-3 text-left font-medium text-zinc-700">Se déconnecter</button>
        </form>
      </section>
    </>
  );
}
