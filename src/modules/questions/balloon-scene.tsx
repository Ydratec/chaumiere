"use client";

// Fond de la carte « Question du jour » : la montgolfière de la salle, avec les personnages dans la nacelle.
// Elle monte d'un cran chaque jour où tous les membres actifs répondent ; on croise des monuments, des montagnes,
// des avions… puis l'espace. Au premier affichage après une montée, on la voit s'élever depuis l'altitude d'avant.

import { useEffect, useState } from "react";
import { Avatar } from "@/src/components/avatar";
import type { Person } from "@/src/modules/rooms/context";
import { altitude, around, formatAlt, type Flight } from "./balloon";

/** Couleurs du ciel selon l'altitude (haut, bas du dégradé), sur une échelle logarithmique. */
const SKY: [number, string, string][] = [
  [0, "#7cc4f5", "#dff2ff"],
  [3, "#4f9fe8", "#bfe0fb"], // 1 km
  [4.1, "#2f6fd1", "#8fc3f2"], // 12 km
  [5, "#14286b", "#3a6fc4"], // 100 km
  [6, "#050a24", "#151c4a"], // 1 000 km
  [9, "#02030d", "#0b0f2a"],
];
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mixHex = (a: string, b: string, t: number) =>
  `rgb(${hex(a).map((x, i) => Math.round(x + (hex(b)[i] - x) * t)).join(",")})`;
function sky(meters: number) {
  const l = Math.log10(meters + 1);
  for (let i = 1; i < SKY.length; i++) {
    if (l <= SKY[i][0]) {
      const [l0, t0, b0] = SKY[i - 1], [l1, t1, b1] = SKY[i];
      const t = (l - l0) / (l1 - l0);
      return [mixHex(t0, t1, t), mixHex(b0, b1, t)];
    }
  }
  return [SKY.at(-1)![1], SKY.at(-1)![2]];
}

/** Étoiles fixes (positions précalculées : identiques côté serveur et navigateur). */
const STARS = Array.from({ length: 28 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 100, r: i % 5 === 0 ? 1.4 : 0.8 }));

export function BalloonScene({ roomId, flight, people }: { roomId: string; flight: Flight; people: Record<string, Person> }) {
  const target = altitude(flight.level);
  // Altitude affichée : part de celle vue la dernière fois sur cet appareil, puis glisse jusqu'à la vraie.
  const [shown, setShown] = useState(target);
  useEffect(() => {
    const key = `balloon:${roomId}`;
    let from = target;
    try {
      const seen = Number(localStorage.getItem(key));
      if (Number.isFinite(seen) && seen >= 0 && seen !== target && localStorage.getItem(key) !== null) from = seen;
      localStorage.setItem(key, String(target));
    } catch {}
    if (from === target) return;
    // animation sur 2 s, en altitude logarithmique (sinon l'espace arriverait d'un coup)
    const a = Math.log10(from + 1), b = Math.log10(target + 1), t0 = performance.now();
    let id = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 2000), e = 1 - (1 - k) ** 3;
      setShown(Math.round(10 ** (a + (b - a) * e) - 1));
      if (k < 1) id = requestAnimationFrame(step);
    };
    setShown(from);
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [roomId, target]);

  const [top, bottom] = sky(shown);
  const { passed, next } = around(shown);
  const space = shown >= 100_000;
  const ground = shown < 400;
  const crew = flight.today.active.length ? flight.today.active : Object.keys(people);
  const on = (id: string) => flight.today.answered.includes(id);
  // Position verticale d'un repère : écart d'altitude en log, autour de la nacelle (en % de la hauteur de la scène).
  // (bornée sous le texte de la question et au-dessus de la ligne du bas ; le repère dépassé reste sous le prochain)
  const yOf = (alt: number) => Math.max(38, Math.min(74, 60 - (Math.log10(alt + 1) - Math.log10(shown + 1)) * 40));
  const yNext = next ? yOf(next.alt) : 38;
  const yPassed = passed ? Math.max(yOf(passed.alt), (next ? yNext : 38) + 17) : 74;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(to bottom, ${top}, ${bottom})` }}>
      {/* étoiles (de plus en plus visibles en montant) */}
      <svg className="absolute inset-0 size-full transition-opacity duration-1000" style={{ opacity: space ? 1 : Math.max(0, (Math.log10(shown + 1) - 4) / 1) }} preserveAspectRatio="none" viewBox="0 0 100 100">
        {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.35} fill="#fff" opacity={0.5 + (i % 3) * 0.2} />)}
      </svg>

      {/* sol : collines et petites maisons, qui s'éloignent en montant */}
      {ground && (
        <svg className="absolute inset-x-0 bottom-0 h-1/3 w-full transition-transform duration-1000" style={{ transform: `translateY(${Math.min(100, shown / 4)}%)` }} viewBox="0 0 200 60" preserveAspectRatio="none">
          <path d="M0 40C30 25 60 30 90 38s70 6 110-8V60H0z" fill="#86c16a" />
          <path d="M0 48c40-10 80-6 120 2s60 2 80-4V60H0z" fill="#6aa955" />
          {[[30, 36], [44, 38], [150, 34]].map(([x, y]) => (
            <g key={x}><rect x={x} y={y} width="8" height="6" fill="#f4e3c3" /><path d={`M${x - 1} ${y}l5-4 5 4z`} fill="#c4473f" /></g>
          ))}
        </svg>
      )}

      {/* nuages à basse altitude */}
      {!space && (
        <div className="absolute inset-0 opacity-80">
          {[[8, 70, 1], [70, 30, 0.8], [40, 85, 0.6]].map(([x, y, s], i) => (
            <span key={i} className="scene-fog absolute rounded-full bg-white/80 blur-[1px]" style={{ left: `${x}%`, top: `${y}%`, width: `${70 * s}px`, height: `${22 * s}px` }} />
          ))}
        </div>
      )}

      {/* repères : le dernier dépassé (en dessous) et le prochain (au-dessus) */}
      {[passed, next].map((l) => l && (
        <div key={l.name} className="absolute left-[6%] flex max-w-[48%] items-center gap-2 transition-[top] duration-1000" style={{ top: `${Math.min(76, l === next ? yNext : yPassed)}%` }}>
          <span className="text-[2.1rem] leading-none drop-shadow">{l.icon}</span>
          <span className={`text-[10px] font-semibold leading-tight ${space || shown > 9000 ? "text-white/80" : "text-slate-700/80"}`}>
            {l.name}
            <span className="block font-normal opacity-80">{formatAlt(l.alt)}{l === next ? " · prochaine étape" : ""}</span>
          </span>
        </div>
      ))}

      {/* la montgolfière, qui flotte doucement, avec l'équipage dans la nacelle */}
      <div className="scene-float absolute right-[6%] top-[42%] flex w-[30%] max-w-[8.5rem] flex-col items-center">
        <svg viewBox="0 0 100 92" className="w-[78%] drop-shadow-lg">
          <path d="M50 2C22 2 6 22 6 42c0 20 20 34 32 46h24c12-12 32-26 32-46C94 22 78 2 50 2z" fill="#f59e0b" />
          <path d="M50 2C36 2 28 22 28 42c0 20 10 34 16 46h12c6-12 16-26 16-46C72 22 64 2 50 2z" fill="hsl(var(--h) 70% 55%)" />
          <path d="M50 2c-5 0-8 20-8 40s4 34 6 46h4c2-12 6-26 6-46S55 2 50 2z" fill="#fde68a" />
          <path d="M8 40h84" stroke="#b45309" strokeWidth="1.5" opacity=".5" />
          <path d="M38 88l6 4h12l6-4" stroke="#7a5131" strokeWidth="1.6" fill="none" />
        </svg>
        <div className="-mt-[2%] flex w-[58%] flex-col items-center">
          <div className="flex -space-x-1.5">
            {crew.slice(0, 5).map((id) => (
              <span key={id} className={`rounded-full ring-2 ring-[#a8743f] ${on(id) ? "" : "opacity-40 grayscale"}`}>
                <Avatar url={people[id]?.url} character={people[id]?.character} name={people[id]?.name ?? "?"} size={20} />
              </span>
            ))}
          </div>
          <span className="block h-3.5 w-full rounded-b-md bg-[#a8743f] shadow-inner" />
          {crew.length > 5 && <span className="mt-0.5 text-[9px] font-semibold text-white drop-shadow">+{crew.length - 5}</span>}
        </div>
      </div>
    </div>
  );
}

/** Ligne du bas de la carte : série, altitude, et qui manque aujourd'hui. */
export function BalloonStatus({ flight, names }: { flight: Flight; names: Record<string, string> }) {
  const t = flight.today;
  const missing = t.missing.map((id) => names[id] ?? "?");
  return (
    <div className="relative mt-auto space-y-1.5 pt-4">
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
        <span className="rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-sm">🔥 {flight.streak} jour{flight.streak > 1 ? "s" : ""} d&apos;affilée</span>
        <span className="rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-sm">🎈 {formatAlt(altitude(flight.level))}</span>
        {flight.best > flight.streak && <span className="rounded-full bg-black/20 px-2.5 py-1 backdrop-blur-sm">record : {flight.best} j</span>}
      </div>
      <p className="text-xs font-medium text-white/90 drop-shadow">
        {t.done
          ? "Tout le monde a répondu : la montgolfière monte ! 🎉"
          : `${t.answered.filter((u) => t.active.includes(u)).length} / ${t.active.length} aujourd'hui · ${missing.length > 3 ? `il manque ${missing.length} personnes` : `il manque ${missing.join(", ").replace(/, ([^,]*)$/, " et $1")}`}`}
      </p>
    </div>
  );
}
