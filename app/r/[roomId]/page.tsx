import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/src/components/avatar";
import { Cat } from "@/src/components/cat";
import { Icon } from "@/src/components/icons";
import type { Activity } from "@/src/modules/activities/registry";
import { ItemIcon } from "@/src/modules/farm/art";
import { readyCount } from "@/src/modules/farm/data";
import { GamesLive } from "@/src/modules/games/live";
import { getRoomContext } from "@/src/modules/rooms/context";

export default async function RoomHome({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const { data: activity } = await ctx.sb.rpc("today_activity", { r: roomId }).single<Activity>();

  const { count } = await ctx.sb
    .from("games").select("id", { count: "exact", head: true })
    .eq("room_id", roomId).eq("status", "open").neq("creator", ctx.user.id)
    .or(`target.is.null,target.eq.${ctx.user.id}`);
  const ready = await readyCount(roomId, ctx.user.id);

  return (
    <>
      <GamesLive roomId={roomId} />
      <Link
        href={`/r/${roomId}/question`}
        className="relative block overflow-hidden rounded-[1.75rem] bg-indigo-600 p-6 text-white transition hover:bg-indigo-700"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-100">Question du jour</p>
        <h2 className="mt-3 pb-2 pr-14 text-2xl font-bold leading-snug tracking-tight">{activity?.payload.text ?? "Pas de question aujourd'hui"}</h2>
        <span className="absolute -right-3 -top-2 opacity-90"><Cat coat={4} mood="wow" size={76} /></span>
      </Link>

      <div className="space-y-4">
        <Link href={`/r/${roomId}/games`} className="group flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm"><Cat coat={2} size={38} /></span>
          <span className="flex-1">
            <span className="block font-semibold">Jeux</span>
          </span>
          {!!count && <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-sm font-semibold text-white">{count}</span>}
          <span className="text-zinc-400 transition group-hover:translate-x-0.5"><Icon name="arrow" size={18} /></span>
        </Link>

        <Link href={`/r/${roomId}/farm`} className="group flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm"><ItemIcon id="wheat" size={30} /></span>
          <span className="flex-1">
            <span className="block font-semibold">Serre</span>
            {!!ready && <span className="block text-sm text-zinc-500">{ready} récolte{ready > 1 ? "s" : ""} prête{ready > 1 ? "s" : ""}</span>}
          </span>
          {!!ready && <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-sm font-semibold text-white">{ready}</span>}
          <span className="text-zinc-400 transition group-hover:translate-x-0.5"><Icon name="arrow" size={18} /></span>
        </Link>
      </div>

      <section>
        <h2 className="eyebrow mb-3">Membres · {ctx.members.length}</h2>
        <div className="flex flex-wrap gap-4">
          {ctx.members.map((m) => (
            <div key={m.user_id} className="flex w-14 flex-col items-center gap-1.5 text-center">
              <Avatar url={m.avatar_url} character={m.character} name={m.username} size={48} />
              <span className="w-full truncate text-xs text-zinc-600">{m.username}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
