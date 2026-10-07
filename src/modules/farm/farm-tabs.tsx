"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserDb } from "@/src/lib/db/client";

/** Sous-onglets de la ferme ; se rafraîchit quand la salle donne, échange ou débloque quelque chose. */
export function FarmTabs({ roomId, tabs }: { roomId: string; tabs: { label: string; badge?: number; content: React.ReactNode }[] }) {
  const [tab, setTab] = useState(0);
  const router = useRouter();
  const [sb] = useState(browserDb);

  useEffect(() => {
    const filter = `room_id=eq.${roomId}`;
    const ch = sb
      .channel(`farm-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "farm_offers", filter }, () => router.refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "farm_contributions", filter }, () => router.refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_unlocks", filter }, () => router.refresh())
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [sb, roomId, router]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-1 rounded-full bg-zinc-200/60 p-1 text-sm font-medium">
        {tabs.map((t, i) => (
          <button key={t.label} onClick={() => { setTab(i); router.refresh(); }} className={`rounded-full py-2 transition ${tab === i ? "bg-white shadow-sm" : "text-zinc-500"}`}>
            {t.label}
            {!!t.badge && <span className="ml-1 rounded-full bg-indigo-600 px-1.5 text-[11px] text-white">{t.badge}</span>}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.label} hidden={tab !== i}>{t.content}</div>
      ))}
    </div>
  );
}
