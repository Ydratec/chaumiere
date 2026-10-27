"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { browserDb } from "@/src/lib/db/client";
import { useSoftRefresh } from "@/src/lib/hooks/use-soft-refresh";

/** Rafraîchit la page serveur quand un jeu de la salle change (nouveau défi, partie lancée…), en regroupant les rafales. */
export function GamesLive({ roomId }: { roomId: string }) {
  const soft = useSoftRefresh();
  const refresh = useEffectEvent(() => soft());
  const [sb] = useState(browserDb);
  useEffect(() => {
    const ch = sb
      .channel(`games-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `room_id=eq.${roomId}` }, () => refresh())
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [sb, roomId]);
  return null;
}
