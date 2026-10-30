import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/src/components/icons";
import { DailyCode } from "@/src/modules/challenges/daily-code";
import { DailyMot } from "@/src/modules/challenges/daily-mot";
import { DailyOrapa } from "@/src/modules/challenges/daily-orapa";
import { kindFor, loadDaily, loadSimpleView } from "@/src/modules/challenges/data";
import type { CodeEntry } from "@/src/modules/challenges/code-daily";
import type { MotEntry } from "@/src/modules/challenges/mot-daily";
import { getRoomContext } from "@/src/modules/rooms/context";

/** Défi du jour : un jeu différent chaque jour (Orapa, Code secret, Mot du jour), le même pour toute la salle. */
export default async function DailyPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const { kind, orapa } = await kindFor(roomId);
  const props = { roomId, me: ctx.user.id, people: ctx.people };
  return (
    <div className="space-y-5" data-no-swipe>
      <Link href={`/r/${roomId}/games`} className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
        <Icon name="back" size={16} /> Jeux
      </Link>
      {kind === "orapa" ? (
        <DailyOrapa {...props} view={await loadDaily(roomId, ctx.user.id)} />
      ) : kind === "code" ? (
        <DailyCode {...props} view={(await loadSimpleView(roomId, ctx.user.id, "code", orapa)) as never} />
      ) : (
        <DailyMot {...props} view={(await loadSimpleView(roomId, ctx.user.id, "mot", orapa)) as never} />
      )}
    </div>
  );
}
