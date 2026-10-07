import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/src/lib/db/server";
import type { Game } from "@/src/modules/games/actions";
import { ENGINES } from "@/src/modules/games/engines";
import { GameView } from "@/src/modules/games/game-view";
import { isGameType } from "@/src/modules/games/labels";
import { getRoomContext } from "@/src/modules/rooms/context";

export default async function GamePage({ params }: { params: Promise<{ roomId: string; gameId: string }> }) {
  const { roomId, gameId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const { data: game } = await ctx.sb.from("games").select("*").eq("id", gameId).eq("room_id", roomId).maybeSingle<Game>();
  if (!game) notFound();

  // Part du secret visible par ce joueur seulement (ex. sa flotte à la bataille navale).
  const view = isGameType(game.type) ? ENGINES[game.type].view : undefined;
  const player = game.creator === ctx.user.id || game.opponent === ctx.user.id;
  let priv: unknown = null;
  if (view && player && game.status !== "open") {
    const { data } = await adminDb().from("game_secrets").select("deck").eq("game_id", gameId).maybeSingle();
    if (data) priv = view(data.deck, ctx.user.id);
  }
  return <GameView initial={game} userId={ctx.user.id} names={ctx.names} people={ctx.people} priv={priv} />;
}
