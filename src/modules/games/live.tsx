"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserDb } from "@/src/lib/db/client";

/** Rafraîchit la page serveur quand un jeu de la salle change (nouveau défi, partie lancée…). */
export function GamesLive({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [sb] = useState(browserDb);
  useEffect(() => {
    const ch = sb
      .channel(`games-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `room_id=eq.${roomId}` }, () => router.refresh())
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [sb, roomId, router]);
  return null;
}
