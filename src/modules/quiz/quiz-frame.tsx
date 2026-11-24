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
  // Le fond clair de l'app reste visible sous la zone affichée (barre du bas d'iOS, rebond, application installée) :
  // tant que le quiz est ouvert, la page entière et la couleur de thème du navigateur passent au noir du jeu.
  useEffect(() => {
    const html = document.documentElement, body = document.body, DARK = "#0C1117";
    const meta = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
    const before = { html: html.style.backgroundColor, body: body.style.background, scheme: html.style.colorScheme, metas: meta.map((m) => m.content) };
    html.style.backgroundColor = DARK;
    body.style.background = DARK;
    html.style.colorScheme = "dark";
    meta.forEach((m) => (m.content = DARK));
    return () => {
      html.style.backgroundColor = before.html;
      body.style.background = before.body;
      html.style.colorScheme = before.scheme;
      meta.forEach((m, i) => (m.content = before.metas[i]));
    };
  }, []);
  return (
    <>
      {/* fond sombre sur tout l'écran (en-tête et dessous de la barre d'onglets compris) : le jeu se prolonge jusqu'en bas */}
      <div aria-hidden className="fixed inset-x-0 -bottom-40 top-0 z-[8] bg-[#0C1117]" />
      <iframe
        ref={frame}
        src={`/quiz/index.html?room=${roomId}${match ? `&m=${encodeURIComponent(match)}` : ""}`}
        title="Géo Quiz"
        className="fixed inset-x-0 top-0 z-[9] w-full border-0 bg-[#0C1117]"
        style={{ height: "calc(100dvh - 5.5rem - env(safe-area-inset-bottom))" }}
      />
    </>
  );
}
