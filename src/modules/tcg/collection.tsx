"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { ItemIcon } from "@/src/modules/farm/art";
import { openBooster } from "./actions";
import { BoosterOpening, type Pulled } from "./booster-opening";
import { CardArt } from "./card-art";
import { TiltCard } from "./tilt";
import { BOOSTER, CARDS, keyOf, RARITIES, splitKey, VARIANT_IDS, VARIANTS, type Card, type Offers, type Rarity, type Source, type Variant } from "./cards";

type Owned = Record<string, number>; // clé : « id » ou « id@variante » (voir keyOf)
const DEV = process.env.NODE_ENV !== "production";
const SETS: (Variant | undefined)[] = [undefined, ...VARIANT_IDS];
const setName = (v?: Variant) => (v ? VARIANTS[v].label : "Normal");
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

/** Collection de cartes : acheter un booster, voir ses cartes, compléter les classeurs (normal et versions alternatives). */
function Collection({ roomId, userId, coins, offers }: { roomId: string; userId: string; coins: number; offers: Offers }) {
  const key = `tcg:${roomId}:${userId}`;
  const router = useRouter();
  const [owned, setOwned] = useState<Owned>(() => load(key));
  const [pack, setPack] = useState<{ n: number; pulled: Pulled[] } | null>(null); // booster de test (plein écran) ; n : le remonte à chaque fois
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const [zoom, setZoom] = useState<{ card: Card; variant?: Variant; burst: number } | null>(null); // burst : relance l'animation de la Légendaire alternative
  const [set, setSet] = useState<Variant | undefined>(undefined);
  const [all, setAll] = useState(false); // mode test : tout voir
  const [view, setView] = useState<"boosters" | "collection">("boosters");

  /** Tire un booster (le serveur vérifie le droit). Un booster de test est gratuit et n'entre pas dans la collection. */
  const draw = async (source: Source | "test"): Promise<{ pulled?: Pulled[]; error?: string }> => {
    const test = source === "test";
    const r = await openBooster(roomId, source);
    if (r.error) return { error: r.error };
    const next = { ...load(key) };
    const pulled = r.cards!.map((k) => {
      const isNew = !next[k];
      if (!test) next[k] = (next[k] ?? 0) + 1;
      return { ...splitKey(k), isNew };
    });
    if (!test) {
      setOwned(next);
      save(key, next);
    }
    router.refresh(); // met à jour les boosters du jour et les pièces
    return { pulled };
  };
  /** Le prochain booster : celui de la question du jour, puis celui du gagnant du défi, puis un acheté. */
  const source: Source | null = offers.question === "ready" ? "question" : offers.win === "ready" ? "win" : offers.buys < BOOSTER.perDay ? "buy" : null;
  const pick = () => (source ? draw(source) : Promise.resolve({ error: "Plus de booster aujourd'hui : reviens demain !" }));
  const caption =
    source === "question" ? "Gratuit : merci d'avoir répondu à la question du jour !"
    : source === "win" ? "Gratuit : bravo pour le défi d'hier !"
    : source === "buy" ? (
      <>
        {coin(BOOSTER.price)} · {offers.buys}/{BOOSTER.perDay} aujourd&apos;hui
        {offers.question === "todo" && <span className="block text-xs"><Link href={`/r/${roomId}/question`} className="underline">Réponds à la question du jour</Link> pour un booster gratuit.</span>}
      </>
    ) : "Plus de booster aujourd'hui : reviens demain !";
  const test = () => start(async () => {
    const r = await draw("test");
    if (r.error) return setError(r.error);
    setPack((p) => ({ n: (p?.n ?? 0) + 1, pulled: r.pulled! }));
  });
  const [ring, setRing] = useState(0); // remonte le carrousel après chaque booster

  const count = (v?: Variant) => CARDS.filter((c) => owned[keyOf(c.id, v)]).length;
  const has = (c: Card) => all || !!owned[keyOf(c.id, set)];

  return (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold tracking-tight">La Khôlle&apos;ction</h2>
        <span className="text-sm">{coin(coins)}</span>
      </div>

      {view === "boosters" ? (
        <>
          {/* Les boosters tournent directement dans la page : on choisit le sien pour l'ouvrir. */}
          <BoosterOpening key={ring} inline onPick={pick} caption={caption} onClose={(toCollection) => { setRing((n) => n + 1); if (toCollection) setView("collection"); }} />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button onClick={() => setView("collection")} className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm active:scale-[0.98]">
            <span className="font-semibold">Ma collection</span>
            <span className="text-sm text-zinc-500 tabular-nums">
              {count()}/{CARDS.length}{count("rainbow") > 0 && <> · Arc-en-ciel {count("rainbow")}/{CARDS.length}</>} <span aria-hidden>→</span>
            </span>
          </button>
        </>
      ) : (
        <button onClick={() => setView("boosters")} className="text-sm font-medium text-zinc-500 hover:text-zinc-900">← Boosters</button>
      )}

      {DEV && (
        <div className="space-y-2 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-bold text-amber-900">Mode test (seulement en local)</p>
          <button onClick={test} disabled={busy} className="btn-soft w-full">
            Booster de test : 2 normales + 3 Arc-en-ciel (gratuit)
          </button>
          <label className="flex items-center gap-2 text-amber-900">
            <input type="checkbox" checked={all} onChange={(e) => { setAll(e.target.checked); if (!e.target.checked && set && !count(set)) setSet(undefined); }} /> Tout voir dans le classeur
          </label>
        </div>
      )}

      {view === "collection" && (
      <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="eyebrow">Classeur · Édition 1</h3>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" data-no-swipe>
          {/* Un onglet de version n'apparaît qu'une fois sa première carte obtenue (ou en mode test « tout voir »). */}
          {SETS.filter((v) => !v || all || count(v) > 0).map((v) => (
            <button
              key={v ?? "normal"}
              onClick={() => setSet(v)}
              aria-pressed={set === v}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${set === v ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 shadow-sm"}`}
            >
              {setName(v)} <span className="tabular-nums opacity-70">{count(v)}/{CARDS.length}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CARDS.map((c) =>
            has(c) ? (
              <button key={c.id} onClick={() => setZoom({ card: c, variant: set, burst: 1 })} className="relative">
                <CardArt card={c} variant={set} round="rounded-lg" lazy still />
                {(owned[keyOf(c.id, set)] ?? 0) > 1 && <span className="absolute bottom-1 right-1 rounded-full bg-zinc-900/80 px-1.5 text-xs font-bold text-white">×{owned[keyOf(c.id, set)]}</span>}
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
        Chances par carte : {Object.values(RARITIES).map((r) => `${r.label} ${r.weight.toLocaleString("fr-FR")} %`).join(" · ")}. Versions alternatives :{" "}
        {VARIANT_IDS.map((v) => `${VARIANTS[v].label} : ${(Object.keys(RARITIES) as Rarity[]).map((r) => `${RARITIES[r].label} 1/${Math.round(1 / VARIANTS[v].chance[r])}`).join(", ")}`).join(" · ")}. Ta collection est gardée sur cet appareil pour l&apos;instant.
      </p>
      </div>
      )}

      {pack && (
        <BoosterOpening
          key={pack.n} pulled={pack.pulled}
          onAgain={async () => { const r = await draw("test"); if (r.pulled) setPack((p) => ({ n: (p?.n ?? 0) + 1, pulled: r.pulled! })); return r; }}
          onClose={(toCollection) => { setPack(null); if (toCollection) setView("collection"); }}
        />
      )}

      {zoom && (
        <div role="dialog" aria-label={zoom.card.name} onClick={() => setZoom(null)} data-no-swipe className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-6">
          {/* Toucher la carte l'incline ; toucher à côté ferme. */}
          <div onClick={(e) => e.stopPropagation()} className="w-[min(80vw,calc(70vh*620/874))]">
            <TiltCard onTap={() => setZoom((z) => z && { ...z, burst: z.burst + 1 })}>{(tilt) => <CardArt card={zoom.card} variant={zoom.variant} tilt={tilt} burst={zoom.burst} />}</TiltCard>
          </div>
          <p className="flex items-center gap-2 font-semibold text-white">
            {zoom.card.name} <RarityTag card={zoom.card} />
            {zoom.variant && <span className="rounded-full bg-gradient-to-r from-amber-300 via-pink-400 to-violet-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">{VARIANTS[zoom.variant].label}</span>}
          </p>
        </div>
      )}
    </section>
  );
}

const noop = () => () => {};
/** La collection vient de l'appareil : on n'affiche qu'une fois la page chargée côté navigateur. */
export function TcgCollection(props: { roomId: string; userId: string; coins: number; offers: Offers }) {
  const ready = useSyncExternalStore(noop, () => true, () => false);
  return ready ? <Collection {...props} /> : <div className="h-96 animate-pulse rounded-2xl bg-zinc-100" />;
}
