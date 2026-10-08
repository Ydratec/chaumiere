"use server";

import type { Activity } from "@/src/modules/activities/registry";
import { readyCount } from "@/src/modules/farm/data";
import { getRoomContext } from "./context";

export type Badges = {
  activityId: string | null;
  answered: boolean;
  lastMessage: { id: number; mine: boolean } | null; // comparé côté appareil au dernier message lu
  games: number; // défis reçus + parties où c'est mon tour
  farm: number; // récoltes prêtes + cadeaux à ouvrir
};

/** Ce qui attend l'utilisateur dans la salle (pour les pastilles de la barre d'onglets). */
export async function getBadges(roomId: string): Promise<Badges | null> {
  const c = await getRoomContext(roomId);
  if (!c) return null;
  const me = c.user.id;
  const { data: activity } = await c.sb.rpc("today_activity", { r: roomId }).single<Activity>();
  const [answer, last, games, farm, gifts] = await Promise.all([
    activity ? c.sb.from("answers").select("user_id").eq("activity_id", activity.id).eq("user_id", me).maybeSingle() : null,
    activity ? c.sb.from("messages").select("id, user_id").eq("activity_id", activity.id).order("id", { ascending: false }).limit(1).maybeSingle() : null,
    c.sb.from("games").select("creator, target, opponent, status, state").eq("room_id", roomId).in("status", ["open", "playing"]),
    readyCount(roomId, me),
    c.sb.from("farm_gifts").select("id", { count: "exact", head: true }).eq("room_id", roomId).eq("receiver", me).eq("opened", false),
  ]);
  const todo = (games.data ?? []).filter((g) =>
    g.status === "open"
      ? g.creator !== me && (!g.target || g.target === me)
      : (g.creator === me || g.opponent === me) && g.state?.turn === me && !g.state?.winner && g.state?.phase !== "setup",
  ).length;
  return {
    activityId: activity?.id ?? null,
    answered: !!answer?.data,
    lastMessage: last?.data ? { id: last.data.id, mine: last.data.user_id === me } : null,
    games: todo,
    farm: farm + (gifts.count ?? 0),
  };
}
