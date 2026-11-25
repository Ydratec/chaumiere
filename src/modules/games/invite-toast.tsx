"use client";
// Petite fenêtre dans l'appli quand quelqu'un propose un jeu ou un défi (à la salle ou à toi) : jeux à deux et
// parties en ligne du Quiz. Écoute les nouvelles lignes en temps réel ; disparaît seule au bout de 8 s.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { Avatar } from "@/src/components/avatar";
import { browserDb } from "@/src/lib/db/client";
import type { Person } from "@/src/modules/rooms/context";
import { QUIZ_GAMES } from "@/src/modules/quiz/scores";
import { GAME_TYPES, isGameType } from "./labels";

type Invite = { key: string; from: string; text: string; href: string };

export function InviteToast({ roomId, me, people, quiz }: { roomId: string; me: string; people: Record<string, Person>; quiz: boolean }) {
  const [sb] = useState(browserDb);
  const [inv, setInv] = useState<Invite | null>(null);
  const path = usePathname();

  const onGame = useEffectEvent((g: { id: string; creator: string; target: string | null; type: string; status: string }) => {
    if (g.creator === me || (g.target && g.target !== me) || g.status !== "open") return;
    const what = isGameType(g.type) ? GAME_TYPES[g.type].label : "un jeu";
    setInv({ key: g.id, from: g.creator, text: g.target ? `te défie : ${what}` : `défie la salle : ${what}`, href: `/r/${roomId}/games/${g.id}` });
  });
  const onQuiz = useEffectEvent((m: { id: string; host: string; target: string | null; game: string; status: string }) => {
    if (!quiz || m.host === me || (m.target && m.target !== me) || m.status !== "lobby") return;
    if (path?.startsWith(`/r/${roomId}/quiz`)) return; // le Quiz affiche déjà ses défis
    const what = QUIZ_GAMES[m.game] ?? "défi sur mesure";
    setInv({ key: m.id, from: m.host, text: m.target ? `te défie au Quiz : ${what}` : `lance une partie de Quiz : ${what}`, href: `/r/${roomId}/quiz?m=${m.id}` });
  });

  useEffect(() => {
    const ch = sb
      .channel(`invites-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "games", filter: `room_id=eq.${roomId}` }, (p) => onGame(p.new as never))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quiz_matches", filter: `room_id=eq.${roomId}` }, (p) => onQuiz(p.new as never))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sb, roomId]);

  useEffect(() => {
    if (!inv) return;
    const t = setTimeout(() => setInv(null), 8000);
    return () => clearTimeout(t);
  }, [inv]);

  if (!inv) return null;
  const p = people[inv.from];
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-30 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div key={inv.key} className="sticker flex w-full max-w-md animate-[toast_.35s_ease-out] items-center gap-3 p-2.5 pl-3">
        <Avatar url={p?.url} character={p?.character} name={p?.name ?? "?"} size={38} />
        <p className="min-w-0 flex-1 text-sm leading-snug"><b className="font-display text-base">{p?.name ?? "Quelqu'un"}</b> {inv.text}</p>
        <Link href={inv.href} onClick={() => setInv(null)} className="rounded-full bg-ink px-3.5 py-1.5 font-display font-bold text-white">Voir</Link>
        <button type="button" aria-label="Fermer" onClick={() => setInv(null)} className="flex size-8 items-center justify-center rounded-full text-zinc-500">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}
