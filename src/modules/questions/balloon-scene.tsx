"use client";

// Carte « Question du jour » avec la montgolfière de la salle, les personnages dans la nacelle.
// Elle monte d'un cran chaque jour où tous les membres actifs répondent ; on croise des monuments, des montagnes,
// des avions… puis l'espace. Au premier affichage après une montée, on la voit s'élever depuis l'altitude d'avant.
//
// Mise en page : tous les textes sont dans le flux (en colonne : question, scène, état du jour) et la scène est une
// grille à deux colonnes (repères à gauche, montgolfière à droite). Rien de positionné en absolu ne porte de texte :
// les textes ne peuvent pas se chevaucher, quelle que soit leur longueur. Le ciel, le sol, les nuages et les étoiles
// sont un décor en arrière-plan, sans texte.

import { useEffect, useState } from "react";
import { Avatar } from "@/src/components/avatar";
import type { Person } from "@/src/modules/rooms/context";
import { altitude, around, formatAlt, type Flight, type Landmark } from "./balloon";

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
const mixHex = (a: string, b: string, t: number) => `rgb(${hex(a).map((x, i) => Math.round(x + (hex(b)[i] - x) * t)).join(",")})`;
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

/** Altitude affichée : part de celle vue la dernière fois sur cet appareil, puis glisse jusqu'à la vraie (2 s). */
function useShownAltitude(roomId: string, target: number) {
  const [shown, setShown] = useState(target);
  useEffect(() => {
    const key = `balloon:${roomId}`;
    let from = target;
    try {
      const raw = localStorage.getItem(key);
      const seen = Number(raw);
      if (raw !== null && Number.isFinite(seen) && seen >= 0) from = seen;
      localStorage.setItem(key, String(target));
    } catch {}
    if (from === target) return;
    // en altitude logarithmique (sinon l'espace arriverait d'un coup)
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
  return shown;
}

export function BalloonCard({ roomId, flight, people, names, question }: {
  roomId: string;
  flight: Flight;
  people: Record<string, Person>;
  names: Record<string, string>;
  question: string;
}) {
  const shown = useShownAltitude(roomId, altitude(flight.level));
  const [top, bottom] = sky(shown);
  const space = shown >= 100_000;
  const dark = shown > 9000; // texte clair sur ciel sombre
  const { passed, next } = around(shown);

  return (
    <div className="relative flex min-h-[21rem] flex-col">
      <Backdrop shown={shown} top={top} bottom={bottom} space={space} />
      {/* voile sombre derrière le texte, pour qu'il reste lisible sur le ciel */}
      <span aria-hidden className="pointer-events-none absolute -inset-x-6 -top-6 h-40 bg-gradient-to-b from-black/45 to-transparent" />

      <p className="relative text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-100">Question du jour</p>
      <h2 className="relative mt-3 text-2xl font-bold leading-snug tracking-tight drop-shadow">{question}</h2>

      {/* la scène : repères à gauche (dans le flux), montgolfière à droite */}
      <div className="relative mt-4 grid flex-1 grid-cols-[minmax(0,1fr)_7.5rem] items-stretch gap-3">
        <div className="flex min-w-0 flex-col justify-between gap-3 py-1">
          {next ? <Mark l={next} dark={dark} label="Prochaine étape" /> : <span />}
          {passed ? <Mark l={passed} dark={dark} label="Dépassé" /> : <span />}
        </div>
        <Balloon flight={flight} people={people} />
      </div>

      <Status flight={flight} names={names} />
    </div>
  );
}

/** Décor sans texte : dégradé du ciel, étoiles, sol et nuages. */
function Backdrop({ shown, top, bottom, space }: { shown: number; top: string; bottom: string; space: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-6 overflow-hidden" style={{ background: `linear-gradient(to bottom, ${top}, ${bottom})` }}>
      <svg className="absolute inset-0 size-full" style={{ opacity: space ? 1 : Math.max(0, Math.log10(shown + 1) - 4) }} preserveAspectRatio="none" viewBox="0 0 100 100">
        {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.35} fill="#fff" opacity={0.5 + (i % 3) * 0.2} />)}
      </svg>
      {shown < 400 && (
        <svg className="absolute inset-x-0 bottom-0 h-1/4 w-full transition-transform duration-1000" style={{ transform: `translateY(${Math.min(100, shown / 4)}%)` }} viewBox="0 0 200 60" preserveAspectRatio="none">
          <path d="M0 40C30 25 60 30 90 38s70 6 110-8V60H0z" fill="#86c16a" />
          <path d="M0 48c40-10 80-6 120 2s60 2 80-4V60H0z" fill="#6aa955" />
        </svg>
      )}
      {!space && [[6, 58, 1], [62, 26, 0.8], [36, 76, 0.6]].map(([x, y, s], i) => (
        <span key={i} className="scene-fog absolute rounded-full bg-white/70 blur-[1px]" style={{ left: `${x}%`, top: `${y}%`, width: `${70 * s}px`, height: `${22 * s}px` }} />
      ))}
    </div>
  );
}

/** Un repère : son icône et son nom (deux lignes au plus, coupées proprement). */
function Mark({ l, dark, label }: { l: Landmark; dark: boolean; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="shrink-0 text-[2rem] leading-none drop-shadow">{l.icon}</span>
      <span className={`min-w-0 text-xs leading-tight ${dark ? "text-white/85" : "text-slate-800/85"}`}>
        <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-70">{label} · {formatAlt(l.alt)}</span>
        <span className="line-clamp-2 font-semibold">{l.name}</span>
      </span>
    </div>
  );
}

/** La montgolfière, qui flotte doucement, avec l'équipage dans la nacelle (grisé tant qu'il n'a pas répondu). */
function Balloon({ flight, people }: { flight: Flight; people: Record<string, Person> }) {
  const crew = flight.today.active.length ? flight.today.active : Object.keys(people);
  const on = (id: string) => flight.today.answered.includes(id);
  return (
    <div aria-hidden className="scene-float flex flex-col items-center justify-center">
      <svg viewBox="0 0 100 92" className="w-[85%] drop-shadow-lg">
        <path d="M50 2C22 2 6 22 6 42c0 20 20 34 32 46h24c12-12 32-26 32-46C94 22 78 2 50 2z" fill="#f59e0b" />
        <path d="M50 2C36 2 28 22 28 42c0 20 10 34 16 46h12c6-12 16-26 16-46C72 22 64 2 50 2z" fill="hsl(var(--h) 70% 55%)" />
        <path d="M50 2c-5 0-8 20-8 40s4 34 6 46h4c2-12 6-26 6-46S55 2 50 2z" fill="#fde68a" />
        <path d="M8 40h84" stroke="#b45309" strokeWidth="1.5" opacity=".5" />
        <path d="M38 88l6 4h12l6-4" stroke="#7a5131" strokeWidth="1.6" fill="none" />
      </svg>
      <div className="-mt-0.5 flex flex-col items-center">
        <div className="flex -space-x-1.5">
          {crew.slice(0, 4).map((id) => (
            <span key={id} className={`rounded-full ring-2 ring-[#a8743f] ${on(id) ? "" : "opacity-40 grayscale"}`}>
              <Avatar url={people[id]?.url} character={people[id]?.character} name={people[id]?.name ?? "?"} size={20} />
            </span>
          ))}
        </div>
        <span className="block h-3.5 w-16 rounded-b-md bg-[#a8743f] shadow-inner" />
        {crew.length > 4 && <span className="mt-0.5 text-[10px] font-semibold text-white drop-shadow">+{crew.length - 4}</span>}
      </div>
    </div>
  );
}

/** Bas de la carte : série, altitude, record, et qui manque aujourd'hui (texte coupé s'il est trop long). */
function Status({ flight, names }: { flight: Flight; names: Record<string, string> }) {
  const t = flight.today;
  const missing = t.missing.map((id) => names[id] ?? "?");
  const list = missing.length > 3 ? `il manque ${missing.length} personnes` : `il manque ${missing.join(", ").replace(/, ([^,]*)$/, " et $1")}`;
  return (
    <div className="relative mt-4 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
        <span className="rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-sm">🔥 {flight.streak} jour{flight.streak > 1 ? "s" : ""} d&apos;affilée</span>
        <span className="rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-sm">🎈 {formatAlt(altitude(flight.level))}</span>
        {flight.best > flight.streak && <span className="rounded-full bg-black/20 px-2.5 py-1 backdrop-blur-sm">record : {flight.best} j</span>}
      </div>
      <p className="line-clamp-2 rounded-xl bg-black/25 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
        {t.done ? "Tout le monde a répondu : la montgolfière monte ! 🎉" : `${t.answered.filter((u) => t.active.includes(u)).length} / ${t.active.length} aujourd'hui · ${list}`}
      </p>
    </div>
  );
}
