"use client";

import { useRef, useState, useTransition } from "react";
import { Glare, TILT } from "./tilt";
import { CardArt } from "./card-art";
import { BY_ID, PACK_ARTS, PACK_TEAR, packImage, RARITIES, VARIANTS, type Rarity, type Variant } from "./cards";

export type Pulled = { id: string; variant?: Variant; isNew: boolean };
type Phase = "choose" | "focus" | "opening" | "reveal" | "done";

const N = 8; // boosters dans le carrousel
const STEP = 360 / N; // degrés entre deux boosters
const STEP_PX = 80; // glisser de 80 px fait tourner d'un booster
const DEAD = 80; // zone morte (px) : la carte du dessus reste sur la pile et s'incline seulement
const PASS = 150; // glisser au-delà passe à la carte suivante (px)
const FOLLOW = 0.5; // après la zone morte, la carte suit le doigt à cette fraction de sa vitesse
const RANK = Object.keys(RARITIES) as Rarity[];
const GLOW: Partial<Record<Rarity, string>> = {
  PR: "0 0 28px rgba(56,189,248,.75)",
  GR: "0 0 36px rgba(167,139,250,.9)",
  L: "0 0 56px rgba(251,191,36,1)",
};
const tear = `${PACK_TEAR * 100}%`;

/** Position d'un booster sur l'anneau : `a` = angle (degrés) par rapport à celui de devant. Il reste face à nous. */
function ring(a: number) {
  const t = (a * Math.PI) / 180, depth = (Math.cos(t) + 1) / 2; // 1 devant, 0 derrière
  return {
    transform: `translateX(${Math.sin(t) * 120}%) translateZ(${(Math.cos(t) - 1) * 320}px) rotateY(${-Math.sin(t) * 25}deg)`,
    zIndex: Math.round(depth * 100),
    filter: `brightness(${0.65 + 0.35 * depth})`,
    opacity: 0.35 + 0.65 * depth, // les boosters de derrière pâlissent (le fond est celui de la page)
  };
}

/** Carte de la pile, `d` rangs sous celle du dessus : elle suit l'inclinaison en plus doux et se décale à l'opposé,
 *  pour qu'on entrevoie ses bords. */
const under = (d: number, t: { x: number; y: number }) =>
  `perspective(900px) translate(${-t.x * d * 5}px, ${d * 6 - t.y * d * 5}px) scale(${1 - d * 0.03}) rotateY(${t.x * TILT * 0.6}deg) rotateX(${-t.y * TILT * 0.6}deg)`;

// La plus rare en dernier (les versions alternatives tout à la fin), pour garder le suspense.
const sorted = (ps: Pulled[]) => [...ps].sort((a, b) => (a.variant ? 10 : 0) + RANK.indexOf(BY_ID[a.id].rarity) - ((b.variant ? 10 : 0) + RANK.indexOf(BY_ID[b.id].rarity)));

/** Ouverture façon « booster » : carrousel 3D, on touche celui de devant pour le prendre en main, on le découpe, puis on fait défiler les cartes.
 *  Deux façons de l'utiliser :
 *  - `inline` + `onPick` : le carrousel est dans la page ; le booster n'est payé / réclamé (`onPick`) qu'au moment où l'on choisit son paquet,
 *    puis la suite passe en plein écran. `caption` : ce que coûtera le prochain booster.
 *  - `pulled` : booster déjà tiré (booster de test), tout en plein écran ; `onAgain` en rouvre un autre.
 *  `onClose(collection)` : fini ; `collection` = aller voir le classeur. */
export function BoosterOpening({ pulled: raw, inline, onPick, caption, onAgain, onClose }: {
  pulled?: Pulled[]; inline?: boolean; onPick?: () => Promise<{ pulled?: Pulled[]; error?: string }>; caption?: React.ReactNode;
  onAgain?: () => Promise<{ error?: string }>; onClose: (collection: boolean) => void;
}) {
  const [pulled, setPulled] = useState(() => sorted(raw ?? []));
  const [phase, setPhase] = useState<Phase>("choose");
  const [packs] = useState(() => Array.from({ length: N }, () => PACK_ARTS[Math.floor(Math.random() * PACK_ARTS.length)]));
  const [rot, setRot] = useState(0); // rotation de l'anneau, en boosters (non bornée, fractionnaire pendant le glisser)
  const front = ((Math.round(rot) % N) + N) % N;
  const [i, setI] = useState(0); // carte affichée
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; k: number | null; cut?: number; rot?: number } | null>(null); // cut : largeur du booster si on découpe ; rot : rotation au départ
  const [cut, setCut] = useState(0); // 0..1 : avancement de la découpe
  const [tilt, setTilt] = useState({ x: 0, y: 0 }); // -1..1 : inclinaison du booster choisi, suit le doigt
  const held = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null); // pile de cartes (repère fixe pour incliner la carte du dessus)
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const turn = (step: number) => setRot((r) => Math.round(r) + step);
  const open = () => {
    setCut(1);
    setPhase("opening");
    setTimeout(() => setPhase("reveal"), 1000);
  };
  const shift = Math.sign(dx) * Math.max(0, Math.abs(dx) - DEAD) * FOLLOW; // déplacement de la carte du dessus, après la zone morte
  const next = () => {
    setDx(0);
    if (i + 1 >= pulled.length) setTimeout(() => setPhase("done"), 250);
    setI((n) => n + 1);
  };

  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = e.target as HTMLElement;
    const k = t.closest<HTMLElement>("[data-k]")?.dataset.k;
    // On découpe si on part du haut du booster choisi.
    const strip = phase === "focus" && t.closest("[data-strip]") ? e.currentTarget.getBoundingClientRect().width : undefined;
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
  // Carrousel : glisser fait tourner l'anneau ; toucher celui de devant le prend en main, un autre l'amène devant.
  const ringDown = (e: React.PointerEvent) => {
    down(e);
    drag.current!.rot = rot;
  };
  const ringMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d) setRot(d.rot! - (e.clientX - d.x) / STEP_PX);
  };
  /** Paquet choisi : on le prend en main (en réclamant / payant le booster d'abord si ce n'est pas déjà fait). */
  const choose = () => {
    if (pulled.length) return setPhase("focus");
    start(async () => {
      const r = await onPick!();
      if (r.error) return setError(r.error);
      setError("");
      setPulled(sorted(r.pulled!));
      setPhase("focus");
    });
  };
  const ringUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (Math.abs(e.clientX - d.x) < 8 && d.k !== null) {
      setRot(Math.round(rot));
      if (d.k === front) return busy || choose();
      const diff = ((((d.k - front) % N) + N + N / 2) % N) - N / 2; // par le plus court chemin
      return setRot(Math.round(rot) + diff);
    }
    setRot(Math.round(rot));
  };

  // Booster choisi : il s'incline sous le doigt ; partir du haut le découpe.
  const tiltTo = (e: React.PointerEvent, el = held.current!) => {
    const r = el.getBoundingClientRect();
    const c = (v: number) => Math.max(-1, Math.min(1, v));
    setTilt({ x: c(((e.clientX - r.left) / r.width - 0.5) * 2), y: c(((e.clientY - r.top) / r.height - 0.5) * 2) });
  };
  const heldDown = (e: React.PointerEvent) => {
    down(e);
    if (!drag.current!.cut) tiltTo(e);
  };
  const heldMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.cut) move(e);
    else tiltTo(e);
  };
  const heldUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    setTilt({ x: 0, y: 0 });
    if (d?.cut) setCut(0);
  };

  /** Relâché : glissé = changer de booster / passer la carte ; simple toucher = ouvrir / passer. */
  const release = (onTap: (k: number | null) => void, onSwipe: (dir: number) => void) => {
    const k = drag.current?.k ?? null;
    const cutting = drag.current?.cut;
    drag.current = null;
    if (cutting) return setCut(0);
    if (phase !== "choose" && phase !== "reveal") return;
    setDragging(false);
    setTilt({ x: 0, y: 0 });
    if (Math.abs(dx) > PASS) onSwipe(dx < 0 ? 1 : -1);
    else if (Math.abs(dx) < 8) onTap(k);
    setDx(0);
  };

  return (
    <div
      role={inline && phase === "choose" ? undefined : "dialog"}
      aria-label="Ouverture d'un booster"
      data-no-swipe
      className={`flex flex-col items-center justify-center overflow-hidden ${inline && phase === "choose" ? "relative -mx-4 py-6 text-zinc-800" : "fixed inset-0 z-50 bg-zinc-950/95 text-white"}`}
    >
      {phase === "choose" && (
        <div className="flex w-full flex-col items-center gap-8">
          <div
            className="relative aspect-[620/874] w-[min(50vw,14rem)] touch-none select-none"
            style={{ perspective: "1000px" }}
            onPointerDown={ringDown}
            onPointerMove={ringMove}
            onPointerUp={ringUp}
            onPointerCancel={ringUp}
          >
            {packs.map((art, k) => (
              <div
                key={k}
                data-k={k}
                role={k === front ? "button" : undefined}
                tabIndex={k === front ? 0 : -1}
                aria-label={k === front ? "Choisir ce booster" : undefined}
                onKeyDown={k === front ? (e) => (e.key === "Enter" || e.key === " ") && choose() : undefined}
                className={`absolute inset-0 ${dragging ? "" : "transition-all duration-500 ease-out"}`}
                style={ring((k - rot) * STEP)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={packImage(art)} alt="" draggable={false} className="h-full w-full rounded-md shadow-2xl" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-16">
            <button onClick={() => turn(-1)} aria-label="Booster précédent" className={`rounded-full px-4 py-2 text-xl ${inline ? "bg-white shadow-sm" : "bg-white/10"}`}>‹</button>
            <button onClick={() => turn(1)} aria-label="Booster suivant" className={`rounded-full px-4 py-2 text-xl ${inline ? "bg-white shadow-sm" : "bg-white/10"}`}>›</button>
          </div>
          {(busy || caption || error) && (
            <div className={`px-4 text-center text-sm ${inline ? "text-zinc-600" : "text-zinc-300"}`}>
              {busy ? "…" : pulled.length ? "Ton booster t'attend : choisis ton paquet." : caption}
              {error && <p role="alert" className={`mt-1 ${inline ? "text-red-600" : "text-red-400"}`}>{error}</p>}
            </div>
          )}
        </div>
      )}

      {(phase === "focus" || phase === "opening") && (
        <>
          {phase === "focus" && (
            <button onClick={() => setPhase("choose")} aria-label="Choisir un autre booster" className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-white/10 px-3 py-1.5 text-lg">‹</button>
          )}
          <div
            ref={held}
            className="tcg-focus-in relative aspect-[620/874] w-[min(64vw,17rem)] touch-none select-none"
            style={{ perspective: "900px" }}
            onPointerDown={phase === "focus" ? heldDown : undefined}
            onPointerMove={phase === "focus" ? heldMove : undefined}
            onPointerUp={phase === "focus" ? heldUp : undefined}
            onPointerCancel={phase === "focus" ? heldUp : undefined}
          >
            <div
              className={`relative h-full w-full ${dragging ? "transition-transform duration-75" : "transition-transform duration-500 ease-out"}`}
              style={{ transform: `rotateY(${tilt.x * TILT}deg) rotateX(${-tilt.y * TILT}deg)` }}
            >
              <div className={`h-full w-full ${phase === "opening" ? "tcg-pack-drop" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={packImage(packs[front])} alt="" draggable={false}
                  className="h-full w-full rounded-md"
                  style={{
                    boxShadow: `${-tilt.x * 24}px ${24 - tilt.y * 12}px 48px rgba(0,0,0,.65)`,
                    clipPath: phase === "opening" ? `inset(${tear} 0 0 0)` : undefined,
                  }}
                />
              </div>
              {phase === "opening" ? (
                <div className="tcg-strip-off pointer-events-none absolute inset-x-0 top-0 rounded-t-md" style={{ height: tear, background: `url(${packImage(packs[front])}) top / 100% auto` }} />
              ) : (
                <>
                  <Glare tilt={tilt} className="rounded-md" />
                  {/* Zone de découpe (plus haute que le pointillé, pour le doigt) */}
                  <div data-strip className="absolute inset-x-0 top-0 h-[16%]" />
                  <div className="pointer-events-none absolute left-0 h-1 -translate-y-1/2 rounded-full bg-white shadow-[0_0_14px_white]" style={{ top: tear, width: `${cut * 100}%` }} />
                </>
              )}
            </div>
          </div>
        </>
      )}

      {phase === "reveal" && (
        <div className="flex w-full flex-col items-center gap-5">
          <p className="text-sm font-semibold tabular-nums text-zinc-400">{Math.min(i + 1, pulled.length)} / {pulled.length}</p>
          {/* La pile monte d'un bloc : on ne voit que la carte du dessus (et des bords). */}
          <div ref={stack} className="tcg-rise relative aspect-[620/874] w-[min(72vw,18rem)]">
            {pulled.map((p, k) => {
              const c = BY_ID[p.id];
              const gone = k < i;
              const top = k === i;
              return (
                <div
                  key={k}
                  className={`absolute inset-0 touch-none select-none ${dragging ? "transition duration-75" : "transition duration-300"}`}
                  style={{
                    zIndex: pulled.length - k,
                    transform: gone ? "translateX(-150%) rotate(-25deg)" : top ? `perspective(900px) translateX(${shift}px) rotate(${shift / 30}deg) rotateY(${tilt.x * TILT}deg) rotateX(${-tilt.y * TILT}deg)` : under(k - i, tilt),
                    opacity: gone ? 0 : 1,
                  }}
                  onPointerDown={top ? (e) => { down(e); tiltTo(e, stack.current!); } : undefined}
                  onPointerMove={top ? (e) => { move(e); if (drag.current) tiltTo(e, stack.current!); } : undefined}
                  onPointerUp={top ? () => release(next, next) : undefined}
                >
                  {/* Les cartes du dessous ne montrent pas leur version : la surprise reste entière jusqu'à ce qu'elles arrivent dessus. */}
                  <CardArt card={c} variant={top ? p.variant : undefined} tilt={top && dragging ? tilt : undefined} glow={top ? GLOW[c.rarity] : undefined} burst={top ? 1 : 0} />
                  {top && <Glare tilt={tilt} className="rounded-2xl" />}
                </div>
              );
            })}
          </div>
          {/* Une version alternative arrive avec un flash. */}
          {pulled[i]?.variant && <div key={`flash${i}`} className="tcg-flash pointer-events-none fixed inset-0 z-[60] bg-white" />}
          {pulled[i] && (
            <div key={i} className="animate-pop flex flex-col items-center gap-1 text-center">
              {pulled[i].variant && <span className="rounded-full bg-gradient-to-r from-amber-300 via-pink-400 to-violet-500 px-3 py-0.5 text-xs font-black uppercase tracking-wide">Version {VARIANTS[pulled[i].variant!].label} !</span>}
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
                <CardArt card={BY_ID[p.id]} variant={p.variant} round="rounded-lg" glow={GLOW[BY_ID[p.id].rarity]} />
                {p.isNew && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold">Nouvelle</span>}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {onAgain && (
              <button onClick={() => start(async () => setError((await onAgain()).error ?? ""))} disabled={busy} className="btn w-full">
                {busy ? "…" : "Un autre booster de test"}
              </button>
            )}
            {error && <p role="alert" className="text-center text-sm text-red-400">{error}</p>}
            <button onClick={() => onClose(true)} className="w-full rounded-full bg-white/10 py-2.5 font-semibold">Voir mon classeur</button>
            {inline && <button onClick={() => onClose(false)} className="w-full py-2 text-sm font-medium text-zinc-400">Retour aux boosters</button>}
          </div>
        </div>
      )}
    </div>
  );
}
