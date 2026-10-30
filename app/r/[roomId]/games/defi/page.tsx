import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/src/components/icons";
import { DailyCode } from "@/src/modules/challenges/daily-code";
import { DailyMot } from "@/src/modules/challenges/daily-mot";
import { DailyOrapa } from "@/src/modules/challenges/daily-orapa";
import { isPuzzle, kindFor, loadDaily, loadPuzzleView, loadSimpleView } from "@/src/modules/challenges/data";
import { DailyCompte } from "@/src/modules/challenges/games/compte-game";
import { DailyHashi } from "@/src/modules/challenges/games/hashi-game";
import { DailyPicross } from "@/src/modules/challenges/games/picross-game";
import { DailyQueens } from "@/src/modules/challenges/games/queens-game";
import { DailyRush } from "@/src/modules/challenges/games/rush-game";
import type { CodeEntry } from "@/src/modules/challenges/code-daily";
import type { MotEntry } from "@/src/modules/challenges/mot-daily";
import { getRoomContext } from "@/src/modules/rooms/context";

/** Défi du jour : un jeu différent chaque jour (Orapa, Picross, Embouteillage, Reines, Le compte est bon, Hashi), le même pour toute la salle. */
const PUZZLES = { picross: DailyPicross, rush: DailyRush, queens: DailyQueens, compte: DailyCompte, hashi: DailyHashi };
export default async function DailyPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const { kind, orapa } = await kindFor(roomId);
  const props = { roomId, me: ctx.user.id, people: ctx.people };
  let game: React.ReactNode;
  if (isPuzzle(kind)) {
    const Game = PUZZLES[kind];
    game = <Game {...props} view={await loadPuzzleView(roomId, ctx.user.id, kind, orapa)} />;
  } else if (kind === "orapa") game = <DailyOrapa {...props} view={await loadDaily(roomId, ctx.user.id)} />;
  else if (kind === "code") game = <DailyCode {...props} view={(await loadSimpleView(roomId, ctx.user.id, "code", orapa)) as never} />;
  else game = <DailyMot {...props} view={(await loadSimpleView(roomId, ctx.user.id, "mot", orapa)) as never} />;
  return (
    <div className="space-y-5" data-no-swipe>
      <Link href={`/r/${roomId}/games`} className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
        <Icon name="back" size={16} /> Jeux
      </Link>
      {game}
    </div>
  );
}
