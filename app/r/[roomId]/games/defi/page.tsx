import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/src/components/icons";
import { DailyOrapa } from "@/src/modules/challenges/daily-orapa";
import { loadDaily } from "@/src/modules/challenges/data";
import { loadUnlocks } from "@/src/modules/farm/data";
import { GAME_LOCKS } from "@/src/modules/farm/projects";
import { getRoomContext } from "@/src/modules/rooms/context";

/** Défi du jour : une grille d'Orapa Mine commune à toute la salle. */
export default async function DailyPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const back = (
    <Link href={`/r/${roomId}/games`} className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
      <Icon name="back" size={16} /> Jeux
    </Link>
  );
  if (!(await loadUnlocks(roomId)).includes(GAME_LOCKS.orapa))
    return <div className="space-y-6">{back}<p className="text-zinc-600">Le défi du jour arrive quand la salle a débloqué Orapa Mine à la serre.</p></div>;
  const view = await loadDaily(roomId, ctx.user.id);
  return (
    <div className="space-y-5" data-no-swipe>
      {back}
      <DailyOrapa roomId={roomId} view={view} me={ctx.user.id} people={ctx.people} />
    </div>
  );
}
