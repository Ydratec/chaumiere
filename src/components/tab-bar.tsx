"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getBadges } from "@/src/modules/rooms/badges";
import { Icon, type IconName } from "./icons";

/** Dernier message lu de la discussion du jour, retenu sur l'appareil (écrit par la discussion). */
export const seenKey = (activityId: string) => `seen:${activityId}`;
function seenMessage(activityId: string) {
  try {
    return Number(localStorage.getItem(seenKey(activityId)) ?? 0);
  } catch {
    return Infinity; // stockage indisponible : on ne signale pas les messages
  }
}

/**
 * Pastilles des onglets (question à faire ou nouveau message, défis/tours de jeu, récoltes prêtes).
 * Rafraîchies à chaque changement d'onglet, toutes les 60 s quand l'app est au premier plan, et au retour dans l'app.
 */
function useBadges(roomId: string, path: string) {
  const [dots, setDots] = useState<{ question: boolean; games: number; farm: number }>({ question: false, games: 0, farm: 0 });
  useEffect(() => {
    let alive = true;
    const load = () =>
      getBadges(roomId).then((b) => {
        if (!alive || !b) return;
        const unread = !!b.lastMessage && !b.lastMessage.mine && !!b.activityId && b.lastMessage.id > seenMessage(b.activityId);
        setDots({ question: (!!b.activityId && !b.answered) || unread, games: b.games, farm: b.farm });
      }).catch(() => {});
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 60_000);
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [roomId, path]);
  return dots;
}

/** Onglets de la salle. `quiz` : le Quiz remplace l'usine (pour l'instant seulement pour l'admin, voir src/modules/quiz/access.ts). */
export function roomTabs(roomId: string, quiz = false) {
  const base = `/r/${roomId}`;
  return [
    { href: base, label: "Accueil", icon: "home" as IconName },
    { href: `${base}/question`, label: "Question", icon: "chat" as IconName },
    { href: `${base}/games`, label: "Jeux", icon: "cards" as IconName },
    quiz ? { href: `${base}/quiz`, label: "Quiz", icon: "globe" as IconName } : { href: `${base}/farm`, label: "Usine", icon: "farm" as IconName },
    { href: `${base}/tcg`, label: "Cartes", icon: "deck" as IconName },
    { href: `${base}/profile`, label: "Profil", icon: "user" as IconName },
  ];
}

/** Barre de navigation du bas pour une salle. */
export function TabBar({ roomId, quiz = false }: { roomId: string; quiz?: boolean }) {
  const path = usePathname();
  const base = `/r/${roomId}`;
  const tabs = roomTabs(roomId, quiz);
  const active = (href: string) => path === href || (href !== base && path.startsWith(href));
  const dots = useBadges(roomId, path);
  const dark = path.startsWith(`${base}/quiz`); // sur le quiz (fond noir), la barre passe en sombre pour se fondre dans le jeu
  const badge: Record<string, number | boolean> = { [`${base}/question`]: dots.question, [`${base}/games`]: dots.games, [`${base}/farm`]: dots.farm };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className={`mx-auto flex max-w-md rounded-full p-1.5 backdrop-blur-md ${dark ? "bg-[#111821]/95 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.8)] ring-1 ring-[#2A3340]" : "bg-white/90 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)]"}`}>
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active(t.href) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium transition-colors ${
              active(t.href) ? (dark ? "bg-[#E8B04B] text-[#0C1117]" : "bg-indigo-600 text-white") : dark ? "text-[#8C93A0] hover:text-[#EDE6D6]" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span className="relative">
              <Icon name={t.icon} size={20} />
              {!active(t.href) && !!badge[t.href] && (typeof badge[t.href] === "number" ? (
                <span className={`absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ${dark ? "ring-[#111821]" : "ring-white"}`}>
                  {badge[t.href] as number}
                </span>
              ) : (
                <span className={`absolute -right-1 -top-0.5 size-2.5 rounded-full bg-red-500 ring-2 ${dark ? "ring-[#111821]" : "ring-white"}`} />
              ))}
            </span>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
