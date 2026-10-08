"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/src/components/avatar";

type Room = { room_id: string; username: string; rooms: { name: string; avatar_url: string | null } };

/** En-tête de salle : toucher le nom ouvre la liste de mes salles pour passer de l'une à l'autre. */
export function RoomSwitcher({ roomId, name, avatar, rooms }: { roomId: string; name: string; avatar: string | null; rooms: Room[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const tab = path.split("/")[3]; // même onglet dans l'autre salle (question, games, farm…), sans la partie en cours
  const href = (id: string) => (tab ? `/r/${id}/${tab}` : `/r/${id}`);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-2xl text-left">
        <Avatar url={avatar} name={name} size={40} />
        <span className="min-w-0 flex-1">
          <span className="eyebrow block">Salle</span>
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xl font-bold tracking-tight">{name}</span>
            <svg viewBox="0 0 24 24" width="18" height="18" className={`shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`} aria-hidden>
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </button>

      {open && (
        <>
          <button aria-label="Fermer" onClick={() => setOpen(false)} className="fixed inset-0 z-20 cursor-default" />
          <div className="animate-pop absolute inset-x-0 top-full z-30 mt-2 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5">
            {rooms.map((r) => (
              <Link
                key={r.room_id}
                href={href(r.room_id)}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-2 py-2 ${r.room_id === roomId ? "bg-indigo-50" : "hover:bg-zinc-50"}`}
              >
                <Avatar url={r.rooms.avatar_url} name={r.rooms.name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.rooms.name}</span>
                  <span className="block truncate text-xs text-zinc-500">{r.username}</span>
                </span>
                {r.room_id === roomId && <span className="text-sm font-bold text-indigo-600">✓</span>}
              </Link>
            ))}
            <Link href="/" onClick={() => setOpen(false)} className="mt-1 block rounded-xl px-2 py-2.5 text-sm font-medium text-indigo-600 hover:bg-zinc-50">
              Rejoindre ou créer une salle
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
