"use client";

import { useRef, useState, useTransition } from "react";
import { BOOSTER, BY_ID, imageOf, RARITIES, type Rarity } from "./cards";

export type Pulled = { id: string; isNew: boolean };
type Phase = "choose" | "opening" | "reveal" | "done";

// Boosters proposés : purement visuels (le contenu est déjà tiré et payé).
// ponytail: dégradés provisoires, à remplacer par le design des boosters.
const PACKS = [
  { from: "#f59e0b", to: "#b45309" },
  { from: "#38bdf8", to: "#1d4ed8" },
  { from: "#a78bfa", to: "#6d28d9" },
  { from: "#fb7185", to: "#be123c" },
  { from: "#34d399", to: "#047857" },
];
const N = PACKS.length;
const RANK = Object.keys(RARITIES) as Rarity[];
const GLOW: Partial<Record<Rarity, string>> = {
  PR: "0 0 28px rgba(56,189,248,.75)",
  GR: "0 0 36px rgba(167,139,250,.9)",
  L: "0 0 56px rgba(251,191,36,1)",
};
const bg = (k: number) => `linear-gradient(160deg, ${PACKS[k].from}, ${PACKS[k].to})`;
/** Écart circulaire entre un booster et celui du centre : -2..2. */
const offset = (k: number, sel: number) => ((k - sel + N + Math.floor(N / 2)) % N) - Math.floor(N / 2);

function Pack({ k }: { k: number }) {
  return (
    <div className="tcg-pack flex aspect-[5/8] w-full flex-col items-center justify-center gap-2 rounded-md text-white shadow-2xl" style={{ background: bg(k) }}>
      <span className="text-3xl font-black uppercase leading-none tracking-wide drop-shadow">Cartes<br />souvenirs</span>
      <span className="text-sm font-bold opacity-90">Édition 1 · {BOOSTER.size} cartes</span>
    </div>
  );
}

/** Ouverture façon « booster » : carrousel circulaire, on touche celui du centre pour l'ouvrir, puis on fait défiler les cartes. */
export function BoosterOpening({ pulled: raw, coins, onAgain, onClose }: {
  pulled: Pulled[]; coins: number; onAgain: () => Promise<{ error?: string }>; onClose: () => void;
}) {
  // La plus rare en dernier, pour garder le suspense.
  const [pulled] = useState(() => [...raw].sort((a, b) => RANK.indexOf(BY_ID[a.id].rarity) - RANK.indexOf(BY_ID[b.id].rarity)));
  const [phase, setPhase] = useState<Phase>("choose");
  const [sel, setSel] = useState(0);
  const [i, setI] = useState(0); // carte affichée
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; k: number | null; cut?: number } | null>(null); // cut : largeur du booster si on découpe
  const [cut, setCut] = useState(0); // 0..1 : avancement de la découpe
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const turn = (step: number) => setSel((s) => (s + step + N) % N);
  const open = () => {
    setCut(1);
    setPhase("opening");
    setTimeout(() => setPhase("reveal"), 1000);
  };
  const next = () => {
    setDx(0);
    if (i + 1 >= pulled.length) setTimeout(() => setPhase("done"), 250);
    setI((n) => n + 1);
  };

  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = e.target as HTMLElement;
    const k = t.closest<HTMLElement>("[data-k]")?.dataset.k;
    // On découpe si on part du haut du booster du centre ; sinon on fait tourner le carrousel.
    const strip = phase === "choose" && t.closest("[data-strip]") ? e.currentTarget.getBoundingClientRect().width : undefined;
    drag.current = { x: e.clientX, k: k === undefined ? null : Number(k), cut: strip };
    setDragging(!strip);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.cut) return setDx(e.clientX - d.x);
    const c = Math.max(0, Math.min(1, Math.abs(e.clientX - d.x) / d.cut));
    setCut(c);
    if (c > 0.65) { drag.current = null; open(); }
  };
  /** Relâché : glissé = changer de booster / passer la carte ; simple toucher = ouvrir / passer. */
  const release = (onTap: (k: number | null) => void, onSwipe: (dir: number) => void) => {
    const k = drag.current?.k ?? null;
    const cutting = drag.current?.cut;
    drag.current = null;
    if (cutting) return setCut(0);
    if (phase !== "choose" && phase !== "reveal") return;
    setDragging(false);
    if (Math.abs(dx) > 50) onSwipe(dx < 0 ? 1 : -1);
    else if (Math.abs(dx) < 8) onTap(k);
    setDx(0);
  };

  return (
    <div role="dialog" aria-label="Ouverture d'un booster" data-no-swipe className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-zinc-950/95 text-white">
      {(phase === "choose" || phase === "opening") && (
        <div className="flex w-full flex-col items-center gap-8">
          <div
            className="relative aspect-[5/8] w-[min(68vw,18rem)] touch-none select-none"
            onPointerDown={phase === "choose" ? down : undefined}
            onPointerMove={phase === "choose" ? move : undefined}
            onPointerUp={phase === "choose" ? () => release((k) => k !== null && k !== sel && setSel(k), turn) : undefined}
          >
            {PACKS.map((_, k) => {
              const d = offset(k, sel);
              const front = d === 0;
              const opening = phase === "opening";
              return (
                <div
                  key={k}
                  data-k={k}
                  role={front ? "button" : undefined}
                  tabIndex={front ? 0 : -1}
                  aria-label={front ? "Ouvrir ce booster" : undefined}
                  onKeyDown={front ? (e) => (e.key === "Enter" || e.key === " ") && open() : undefined}
                  className={`absolute inset-0 ${dragging ? "" : "transition-all duration-300"}`}
                  style={{
                    zIndex: 10 - Math.abs(d),
                    transform: `translateX(calc(${d * 72}% + ${front || Math.abs(d) === 1 ? dx : 0}px)) scale(${1 - Math.abs(d) * 0.22}) rotateY(${-d * 18}deg)`,
                    opacity: Math.abs(d) > 1 || (opening && !front) ? 0 : Math.abs(d) === 1 ? 0.55 : 1,
                  }}
                >
                  <div className={front && opening ? "tcg-pack-drop" : ""}><Pack k={k} /></div>
                  {front && opening && <div className="tcg-strip-off pointer-events-none absolute inset-x-0 top-0 h-[12%] rounded-t-md" style={{ background: bg(k) }} />}
                  {front && !opening && (
                    <>
                      {/* Zone de découpe (plus haute que le trait, pour le doigt) */}
                      <div data-strip className="absolute inset-x-0 top-0 h-[24%]" />
                      <div className="pointer-events-none absolute inset-x-[6%] top-[12%] border-t-2 border-dashed border-white/70" />
                      <div className="pointer-events-none absolute left-0 top-[12%] h-1 -translate-y-1/2 rounded-full bg-white shadow-[0_0_14px_white]" style={{ width: `${cut * 100}%` }} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className={`flex items-center gap-6 transition-opacity ${phase === "opening" ? "opacity-0" : ""}`}>
            <button onClick={() => turn(-1)} aria-label="Booster précédent" className="rounded-full bg-white/10 px-4 py-2 text-xl">‹</button>
            <p className="text-sm text-zinc-300">Glisse le long du pointillé pour ouvrir</p>
            <button onClick={() => turn(1)} aria-label="Booster suivant" className="rounded-full bg-white/10 px-4 py-2 text-xl">›</button>
          </div>
        </div>
      )}

      {phase === "reveal" && (
        <div className="flex w-full flex-col items-center gap-5">
          <p className="text-sm font-semibold tabular-nums text-zinc-400">{Math.min(i + 1, pulled.length)} / {pulled.length}</p>
          <div className="relative aspect-[620/874] w-[min(72vw,18rem)]">
            {pulled.map((p, k) => {
              const c = BY_ID[p.id];
              const gone = k < i;
              const top = k === i;
              return (
                <div
                  key={k}
                  className={`tcg-rise absolute inset-0 touch-none select-none ${dragging && top ? "" : "transition duration-300"}`}
                  style={{
                    zIndex: pulled.length - k,
                    animationDelay: `${k * 60}ms`,
                    transform: gone ? "translateX(-150%) rotate(-25deg)" : top ? `translateX(${dx}px) rotate(${dx / 18}deg)` : `translateY(${(k - i) * 6}px) scale(${1 - (k - i) * 0.03})`,
                    opacity: gone ? 0 : 1,
                  }}
                  onPointerDown={top ? down : undefined}
                  onPointerMove={top ? move : undefined}
                  onPointerUp={top ? () => release(next, next) : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageOf(c)} alt={c.name} draggable={false} className="h-full w-full rounded-2xl" style={{ boxShadow: top ? GLOW[c.rarity] : undefined }} />
                  {top && (c.rarity === "L" || c.rarity === "GR") && <div className="tcg-shine pointer-events-none absolute inset-0 rounded-2xl" />}
                </div>
              );
            })}
          </div>
          {pulled[i] && (
            <div key={i} className="animate-pop flex flex-col items-center gap-1 text-center">
              <span className="text-lg font-bold">{BY_ID[pulled[i].id].name}</span>
              <span className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${RARITIES[BY_ID[pulled[i].id].rarity].color}`}>{RARITIES[BY_ID[pulled[i].id].rarity].label}</span>
                {pulled[i].isNew && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold">Nouvelle !</span>}
              </span>
            </div>
          )}
          <p className="text-xs text-zinc-500">Touche ou glisse la carte pour passer à la suivante</p>
        </div>
      )}

      {phase === "done" && (
        <div className="w-full max-w-sm space-y-6 px-4">
          <h2 className="text-center text-xl font-bold">Ton booster</h2>
          <div className="grid grid-cols-3 gap-2">
            {pulled.map((p, k) => (
              <div key={k} className="animate-pop relative" style={{ animationDelay: `${k * 80}ms` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageOf(BY_ID[p.id])} alt={BY_ID[p.id].name} className="w-full rounded-lg" style={{ boxShadow: GLOW[BY_ID[p.id].rarity] }} />
                {p.isNew && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold">Nouvelle</span>}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <button onClick={() => start(async () => setError((await onAgain()).error ?? ""))} disabled={busy || coins < BOOSTER.price} className="btn w-full">
              {busy ? "…" : `Ouvrir un autre booster · ${BOOSTER.price} pièces`}
            </button>
            {error && <p role="alert" className="text-center text-sm text-red-400">{error}</p>}
            <button onClick={onClose} className="w-full rounded-full bg-white/10 py-2.5 font-semibold">Voir mon classeur</button>
          </div>
        </div>
      )}
    </div>
  );
}
