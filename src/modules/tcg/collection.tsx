"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { ItemIcon } from "@/src/modules/farm/art";
import { openBooster } from "./actions";
import { BoosterOpening, type Pulled } from "./booster-opening";
import { BOOSTER, CARDS, imageOf, RARITIES, type Card } from "./cards";

type Owned = Record<string, number>;
const coin = (n: number) => <span className="inline-flex items-center gap-1 font-semibold tabular-nums">{n.toLocaleString("fr-FR")} <ItemIcon id="coins" size={16} /></span>;

function load(key: string): Owned {
  try { return JSON.parse(localStorage.getItem(key) ?? "{}"); } catch { return {}; }
}
function save(key: string, owned: Owned) {
  try { localStorage.setItem(key, JSON.stringify(owned)); } catch {}
}

function RarityTag({ card }: { card: Card }) {
  const r = RARITIES[card.rarity];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.color}`}>{r.label}</span>;
}

/** Collection de cartes : acheter un booster, voir ses cartes, compléter le classeur. */
function Collection({ roomId, userId, coins }: { roomId: string; userId: string; coins: number }) {
  const key = `tcg:${roomId}:${userId}`;
  const router = useRouter();
  const [owned, setOwned] = useState<Owned>(() => load(key));
  const [pack, setPack] = useState<{ n: number; pulled: Pulled[] } | null>(null); // n : remonte l'ouverture à chaque achat
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const [zoom, setZoom] = useState<Card | null>(null);

  const buy = async () => {
    const r = await openBooster(roomId);
    if (r.error) return { error: r.error };
    const next = { ...load(key) };
    const pulled = r.cards!.map((id) => {
      const isNew = !next[id];
      next[id] = (next[id] ?? 0) + 1;
      return { id, isNew };
    });
    setOwned(next);
    save(key, next);
    setPack((p) => ({ n: (p?.n ?? 0) + 1, pulled }));
    router.refresh();
    return {};
  };

  const have = CARDS.filter((c) => owned[c.id]).length;

  return (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Cartes souvenirs</h2>
        <span className="text-sm">{coin(coins)}</span>
      </div>

      <button onClick={() => start(async () => setError((await buy()).error ?? ""))} disabled={busy || coins < BOOSTER.price} className="btn w-full">
        {busy ? "…" : <>Ouvrir un booster · {coin(BOOSTER.price)}</>}
      </button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="eyebrow">Classeur · Édition 1</h3>
          <span className="text-sm font-semibold tabular-nums">{have} / {CARDS.length}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CARDS.map((c) =>
            owned[c.id] ? (
              <button key={c.id} onClick={() => setZoom(c)} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageOf(c)} alt={c.name} loading="lazy" className="w-full rounded-lg shadow-sm" />
                {owned[c.id] > 1 && <span className="absolute bottom-1 right-1 rounded-full bg-zinc-900/80 px-1.5 text-xs font-bold text-white">×{owned[c.id]}</span>}
              </button>
            ) : (
              <div key={c.id} className="flex aspect-[620/874] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-100 p-1 text-center">
                <span className="text-2xl font-bold text-zinc-300">?</span>
                <RarityTag card={c} />
              </div>
            ),
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Chances par carte : {Object.values(RARITIES).map((r) => `${r.label} ${r.weight} %`).join(" · ")}. Ta collection est gardée sur cet appareil pour l&apos;instant.
      </p>

      {pack && <BoosterOpening key={pack.n} pulled={pack.pulled} coins={coins} onAgain={buy} onClose={() => setPack(null)} />}

      {zoom && (
        <div role="dialog" aria-label={zoom.name} onClick={() => setZoom(null)} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageOf(zoom)} alt={zoom.name} className="max-h-[80vh] w-auto max-w-full rounded-2xl" />
          <p className="flex items-center gap-2 font-semibold text-white">{zoom.name} <RarityTag card={zoom} /></p>
        </div>
      )}
    </section>
  );
}

const noop = () => () => {};
/** La collection vient de l'appareil : on n'affiche qu'une fois la page chargée côté navigateur. */
export function TcgCollection(props: { roomId: string; userId: string; coins: number }) {
  const ready = useSyncExternalStore(noop, () => true, () => false);
  return ready ? <Collection {...props} /> : <div className="h-96 animate-pulse rounded-2xl bg-zinc-100" />;
}
