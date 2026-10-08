"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ItemIcon } from "@/src/modules/farm/art";
import { buyQuestion } from "./shop-actions";
import { PACK_FACTOR, PACK_SIZE, THEMES, type Theme } from "./themes";

/** Acheter une question en plus (ou un pack à thème) avec les pièces de la serre. Toucher choisit, le bouton confirme. */
export function QuestionShop({ roomId, price, coins }: { roomId: string; price: number; coins: number }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Theme | "extra" | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const cost = (t: Theme | "extra") => (t === "extra" ? price : price * PACK_FACTOR);
  const coin = (n: number, size = 14) => <span className="inline-flex items-center gap-1">{n} <ItemIcon id="coins" size={size} /></span>;
  const chip = (t: Theme | "extra", label: string) => (
    <button
      key={t}
      type="button"
      aria-pressed={picked === t}
      onClick={() => { setPicked(picked === t ? null : t); setError(""); }}
      className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium transition active:scale-95 ${picked === t ? "bg-indigo-50 ring-2 ring-indigo-500" : "bg-white shadow-sm"}`}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 text-xs text-zinc-500">{coin(cost(t), 12)}</span>
    </button>
  );
  const buy = () =>
    picked && start(async () => {
      const r = await buyQuestion(roomId, picked === "extra" ? null : picked);
      if (r.error) return setError(r.error);
      router.push(`/r/${roomId}/question?a=${r.id}`);
    });

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="eyebrow">Ajouter une question</h2>
        <span className="text-sm font-semibold">{coin(coins)}</span>
      </div>
      {chip("extra", "Question en plus")}
      <p className="eyebrow pt-1">Packs à thème · 1 question par jour pendant {PACK_SIZE} jours</p>
      <div className="grid grid-cols-2 gap-2">{(Object.entries(THEMES) as [Theme, string][]).map(([t, name]) => chip(t, name))}</div>
      {picked && (
        <button onClick={buy} disabled={pending || cost(picked) > coins} className="btn w-full">
          {cost(picked) > coins ? "Pas assez de pièces" : <>Acheter · {coin(cost(picked), 16)}</>}
        </button>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-zinc-500">Elles s&apos;ajoutent à la question du jour, pour toute la salle. Le prix double à chaque achat, puis redescend un peu chaque jour.</p>
    </section>
  );
}
