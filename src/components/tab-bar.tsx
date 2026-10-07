"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

export function roomTabs(roomId: string, isAdmin: boolean) {
  const base = `/r/${roomId}`;
  return [
    { href: base, label: "Accueil", icon: "home" as IconName },
    { href: `${base}/question`, label: "Question", icon: "chat" as IconName },
    { href: `${base}/games`, label: "Jeux", icon: "cards" as IconName },
    { href: `${base}/farm`, label: "Serre", icon: "farm" as IconName },
    { href: `${base}/manage`, label: isAdmin ? "Salle" : "Membres", icon: "users" as IconName },
    { href: `${base}/profile`, label: "Profil", icon: "user" as IconName },
  ];
}

/** Barre de navigation du bas pour une salle. */
export function TabBar({ roomId, isAdmin }: { roomId: string; isAdmin: boolean }) {
  const path = usePathname();
  const base = `/r/${roomId}`;
  const tabs = roomTabs(roomId, isAdmin);
  const active = (href: string) => path === href || (href !== base && path.startsWith(href));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md rounded-full bg-white/90 p-1.5 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] backdrop-blur-md">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active(t.href) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium transition-colors ${
              active(t.href) ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Icon name={t.icon} size={20} />
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
