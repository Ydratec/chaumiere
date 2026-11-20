"use client";

import { useEffect, useRef, useState } from "react";
import { browserDb } from "@/src/lib/db/client";

/**
 * Le Géo Quiz (page autonome public/quiz) dans un cadre plein écran, au-dessus de la barre d'onglets.
 * Relais temps réel : on écoute les parties en ligne de la salle (Supabase) et on prévient le jeu dans le cadre,
 * qui recharge alors l'état de la partie (il interroge aussi le serveur régulièrement, au cas où).
 */
export function QuizFrame({ roomId, match }: { roomId: string; match?: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [sb] = useState(browserDb);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ping = () => {
      clearTimeout(timer); // regroupe les rafales (plusieurs réponses à la fois)
      timer = setTimeout(() => frame.current?.contentWindow?.postMessage({ type: "quiz-live" }, window.location.origin), 80);
    };
    const filter = `room_id=eq.${roomId}`;
    const ch = sb
      .channel(`quiz-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_matches", filter }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_match_players", filter }, ping)
      .subscribe();
    return () => {
      clearTimeout(timer);
      sb.removeChannel(ch);
    };
  }, [sb, roomId]);
  return (
    <>
      {/* fond sombre sur tout l'écran (en-tête et dessous de la barre d'onglets compris) : le jeu se prolonge jusqu'en bas */}
      <div aria-hidden className="fixed inset-0 z-[8] bg-[#050506]" />
      <iframe
        ref={frame}
        src={`/quiz/index.html?room=${roomId}${match ? `&m=${encodeURIComponent(match)}` : ""}`}
        title="Géo Quiz"
        className="fixed inset-x-0 top-0 z-[9] w-full border-0 bg-[#050506]"
        style={{ height: "calc(100dvh - 5.5rem - env(safe-area-inset-bottom))" }}
      />
    </>
  );
}
