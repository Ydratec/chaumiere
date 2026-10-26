"use client";

// Scènes de l'histoire jouées dans sa propre serre : les habitants entrent, marchent entre les bacs, parlent dans des bulles ;
// la nuit tombe, la brume monte, les lanternes s'allument. Une scène est une liste d'étapes (types.ts : Step), décrite dans les chapitres.

import { useEffect, useRef, useState } from "react";
import { CharacterSprite } from "@/src/components/character-sprite";
import type { Character } from "@/src/modules/characters/catalog";
import { ObjectArt } from "../art";
import { GRID_W } from "../catalog";
import { GreenhouseFloor, GreenhouseWall } from "../greenhouse";
import { findPath, occupancy, producedOf, recipeOf, sizeOf, type Cell, type Tile } from "../rules";
import { NPCS } from "./ch1";
import { NpcPortrait } from "./npc-art";
import type { Emote, Mood, Prop, Spot, Step, Who } from "./types";

const STEP_MS = 280; // un pas d'habitant (un peu plus lent que le chat : on a le temps de regarder)
const TYPE_MS = 24; // une lettre qui s'écrit

export type Stage = { tiles: Tile[]; h: number; me: Cell; character: Character; name: string };
type Actor = { at: Cell; facing: 1 | -1; shown: boolean; walking: boolean; emote: { e: Emote; n: number } | null };
type Show =
  | { kind: "say"; who: Who; text: string }
  | { kind: "narrate"; text: string }
  | { kind: "prop"; prop: Prop; text?: string }
  | { kind: "choice"; options: Extract<Step, { do: "choice" }>["options"] }
  | null;

const EMOJI: Record<Emote, string> = { heart: "❤️", tear: "💧", surprise: "❗", laugh: "😄", music: "🎵", zzz: "💤", dots: "…", anger: "💢" };
/** Couleur du corps de chaque habitant (Mirabelle, fantôme, n'a pas de corps : elle flotte). */
const BODY: Record<Who, string | null> = { mirabelle: null, pistache: "#e07a24", colonel: "#2f4a6b", zinnia: "#6aa36f", basile: "#3f5f8a" };
const NO_MOOD: Mood = { night: 0, fog: 0, lanterns: 0, rain: false };
/** Où s'allument les lanternes (en cases), dans l'ordre. */
const LANTERNS: Cell[] = [
  { x: 1, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 5 }, { x: 11, y: 5 }, { x: 3, y: 2 }, { x: 8, y: 2 }, { x: 0, y: 9 }, { x: 11, y: 9 },
  { x: 6, y: 4 }, { x: 2, y: 7 }, { x: 9, y: 7 },
];

const key = (c: Cell) => `${c.x},${c.y}`;
const fill = (text: string, name: string) => text.replaceAll("{nom}", name);

/** Case libre la plus proche de `goal` (ni objet, ni autre habitant). */
function nearestFree(tiles: Tile[], h: number, goal: Cell, taken: Set<string>) {
  const occ = occupancy(tiles);
  const free = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < GRID_W && c.y < h && !occ.has(key(c)) && !taken.has(key(c));
  const start = { x: Math.min(GRID_W - 1, Math.max(0, goal.x)), y: Math.min(h - 1, Math.max(0, goal.y)) };
  const seen = new Set([key(start)]);
  const queue = [start];
  while (queue.length) {
    const c = queue.shift()!;
    if (free(c)) return c;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: c.x + dx, y: c.y + dy };
      if (n.x >= 0 && n.y >= 0 && n.x < GRID_W && n.y < h && !seen.has(key(n))) seen.add(key(n)), queue.push(n);
    }
  }
  return start;
}

/** Joue une scène par-dessus tout l'écran, dans un décor qui reprend sa serre. `onDone` : à la fin (ou « Passer »). */
export function ScenePlayer({ steps, stage, onDone, title }: { steps: Step[]; stage: Stage; onDone: () => void; title?: string }) {
  const { tiles, h, me } = stage;
  const [i, setI] = useState(-1); // -1 : titre d'ouverture
  const [actors, setActors] = useState<Partial<Record<Who, Actor>>>({});
  const [mood, setMood] = useState<Mood>(NO_MOOD);
  const [show, setShow] = useState<Show>(null);
  const [typed, setTyped] = useState(0);
  const [black, setBlack] = useState<{ text?: string } | null>(title ? { text: title } : null);
  const [meEmote, setMeEmote] = useState<{ e: Emote; n: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const actorsRef = useRef(actors);
  useEffect(() => {
    actorsRef.current = actors;
  }, [actors]);

  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const next = () => setI((n) => n + 1);
  const patch = (who: Who, p: Partial<Actor>) => setActors((a) => ({ ...a, [who]: { ...(a[who] as Actor), ...p } }));

  // Ouverture : écran noir avec le titre, puis la scène commence.
  useEffect(() => {
    if (i !== -1) return;
    later(title ? 1700 : 0, () => { setBlack(null); next(); });
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  function spot(s: Spot | undefined, who: Who): Cell {
    const taken = new Set(Object.entries(actorsRef.current).filter(([w, a]) => w !== who && a?.shown).map(([, a]) => key(a!.at)));
    taken.add(key(me));
    if (typeof s === "object") return nearestFree(tiles, h, s, taken);
    switch (s ?? "door") {
      case "door": return nearestFree(tiles, h, { x: 6, y: 0 }, taken);
      case "center": return nearestFree(tiles, h, { x: 6, y: Math.floor(h / 2) }, taken);
      case "left": return nearestFree(tiles, h, { x: 2, y: Math.floor(h / 2) }, taken);
      case "right": return nearestFree(tiles, h, { x: 9, y: Math.floor(h / 2) }, taken);
      case "player": return nearestFree(tiles, h, { x: me.x + (who === "mirabelle" ? -1 : 1), y: me.y }, taken);
    }
  }

  function walk(who: Who, to: Cell, then: () => void) {
    const a = actorsRef.current[who];
    if (!a) return then();
    const path = findPath(tiles, h, a.at, [to]);
    if (!path || !path.length) {
      patch(who, { at: to });
      return later(150, then);
    }
    patch(who, { walking: true });
    let here = a.at;
    path.forEach((c, n) =>
      later(n * STEP_MS, () => {
        const facing = c.x === here.x ? undefined : c.x > here.x ? 1 : -1;
        here = c;
        patch(who, { at: c, ...(facing ? { facing } : {}) });
      }),
    );
    later(path.length * STEP_MS, () => { patch(who, { walking: false }); then(); });
  }

  // Une étape à la fois : celles qui attendent un toucher s'affichent, les autres s'enchaînent seules.
  useEffect(() => {
    run();
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  function run() {
    if (i < 0) return;
    if (i >= steps.length) return onDone();
    const s = steps[i];
    setShow(null);
    setTyped(0);
    switch (s.do) {
      case "enter": {
        const at = spot(s.at, s.who);
        setActors((a) => ({ ...a, [s.who]: { at, facing: at.x <= me.x ? 1 : -1, shown: true, walking: false, emote: null } }));
        return later(450, next);
      }
      case "walk": return walk(s.who, spot(s.to, s.who), next);
      case "leave": {
        const to = spot(s.to ?? "door", s.who);
        return walk(s.who, to, () => { patch(s.who, { shown: false }); later(450, next); });
      }
      case "say": {
        const a = actorsRef.current[s.who];
        if (a) {
          const facing = a.at.x === me.x ? a.facing : a.at.x < me.x ? 1 : -1;
          patch(s.who, { facing, ...(s.emote ? { emote: { e: s.emote, n: i } } : {}) });
        }
        return setShow({ kind: "say", who: s.who, text: s.text });
      }
      case "narrate": return setShow({ kind: "narrate", text: s.text });
      case "prop": return setShow({ kind: "prop", prop: s.prop, text: s.text });
      case "choice": return setShow({ kind: "choice", options: s.options });
      case "emote":
        if (s.who === "player") setMeEmote({ e: s.emote, n: i });
        else patch(s.who, { emote: { e: s.emote, n: i } });
        return later(1100, next);
      case "mood":
        setMood((m) => ({ ...m, ...s.mood }));
        return later(900, next);
      case "fade":
        setBlack({ text: s.text });
        return later(s.text ? 2200 : 900, () => { setBlack(null); later(500, next); });
      case "wait": return later(s.ms, next);
    }
  }

  // Le texte s'écrit lettre à lettre.
  const full = show?.kind === "say" || show?.kind === "narrate" ? fill(show.text, stage.name) : "";
  useEffect(() => {
    if (!full || typed >= full.length) return;
    const id = setTimeout(() => setTyped((t) => Math.min(full.length, t + 1)), TYPE_MS);
    return () => clearTimeout(id);
  }, [full, typed]);

  function tap() {
    if (!show || show.kind === "choice") return;
    if (full && typed < full.length) return setTyped(full.length); // d'abord finir la phrase
    next();
  }
  function choose(o: Extract<Show, { kind: "choice" }>["options"][number]) {
    if (!o.reply) return next();
    const r = o.reply;
    setTyped(0);
    setShow({ kind: "say", who: r.who, text: r.text });
  }

  const pos = (c: Cell) => ({ left: `${((c.x + 0.5) / GRID_W) * 100}%`, top: `${((c.y + 1) / h) * 100}%` });
  const speaking = show?.kind === "say" ? show.who : null;

  return (
    <div className="fixed inset-0 z-[1300] flex flex-col bg-black" role="dialog" aria-label="Scène de l'histoire" onClick={tap}>
      {/* bandes de cinéma */}
      <div className="flex h-[max(3rem,env(safe-area-inset-top))] shrink-0 items-end justify-end px-4 pb-2">
        <button
          onClick={(e) => { e.stopPropagation(); onDone(); }}
          className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70"
        >
          Passer ›
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2">
        <div className="relative w-full" style={{ maxWidth: `min(28rem, calc((100dvh - 19rem) * ${(GRID_W / (h + 80 / 24)).toFixed(3)}))` }}>
          <div className="overflow-hidden rounded-t-[1.2rem]"><GreenhouseWall w={GRID_W} /></div>
          <div className="relative isolate w-full" style={{ aspectRatio: `${GRID_W} / ${h}` }}>
            <div className="absolute inset-0 overflow-hidden rounded-b-[1.2rem]"><GreenhouseFloor w={GRID_W} h={h} /></div>
            {tiles.map((t) => {
              const [w, hh] = sizeOf(t.kind);
              const r = recipeOf(t.kind, t.item);
              return (
                <div key={`${t.x}-${t.y}`} className="absolute p-[2px]" style={{ left: `${(t.x / GRID_W) * 100}%`, top: `${(t.y / h) * 100}%`, width: `${(w / GRID_W) * 100}%`, height: `${(hh / h) * 100}%`, zIndex: (t.y + hh) * 2 }}>
                  <ObjectArt kind={t.kind} item={r ? producedOf(t)! : null} growth={t.item ? 0.7 : 0} />
                </div>
              );
            })}

            {/* soi-même */}
            <div className="pointer-events-none absolute" style={{ ...pos(me), width: `${(1.6 / GRID_W) * 100}%`, transform: "translate(-50%, -92%)", zIndex: (me.y + 1) * 2 + 1 }}>
              <div className="[&>svg]:h-auto [&>svg]:w-full"><CharacterSprite character={stage.character} walking={false} /></div>
              {meEmote && <EmoteBubble key={meEmote.n} e={meEmote.e} />}
            </div>

            {/* les habitants */}
            {(Object.entries(actors) as [Who, Actor][]).map(([who, a]) => (
              <div
                key={who}
                className="pointer-events-none absolute transition-[left,top,opacity] ease-linear"
                style={{ ...pos(a.at), width: `${(1.9 / GRID_W) * 100}%`, transform: "translate(-50%, -88%)", opacity: a.shown ? (who === "mirabelle" ? 0.88 : 1) : 0, transitionDuration: `${STEP_MS}ms, ${STEP_MS}ms, 400ms`,
                  // le fantôme luit dans la nuit : par-dessus l'obscurité
                  zIndex: who === "mirabelle" && mood.night > 0.3 ? 960 : (a.at.y + 1) * 2 + 1, filter: who === "mirabelle" && mood.night > 0.3 ? "drop-shadow(0 0 6px rgba(200,225,255,.9))" : undefined }}
              >
                <Body who={who} walking={a.walking} facing={a.facing} speaking={speaking === who} />
                {a.emote && <EmoteBubble key={a.emote.n} e={a.emote.e} />}
              </div>
            ))}

            {/* ambiance (sur toute la serre, verrière comprise) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[950] overflow-hidden rounded-[1.2rem]" style={{ top: `${-(80 / (24 * h)) * 100}%` }}>
            <div className="pointer-events-none absolute inset-0 bg-[#101a3d] transition-opacity duration-[1500ms]" style={{ opacity: mood.night * 0.62 }} />
            <div className="pointer-events-none absolute inset-0 transition-opacity duration-[1500ms]" style={{ opacity: mood.fog }}>
              <div className="scene-fog absolute -inset-[15%]" style={{ background: "radial-gradient(40% 30% at 30% 40%, rgba(235,240,248,.85), transparent 70%), radial-gradient(35% 25% at 75% 70%, rgba(235,240,248,.8), transparent 70%)" }} />
              <div className="scene-fog-2 absolute -inset-[15%]" style={{ background: "radial-gradient(45% 30% at 60% 25%, rgba(225,232,242,.75), transparent 70%), radial-gradient(40% 30% at 20% 85%, rgba(225,232,242,.7), transparent 70%)" }} />
            </div>
            {mood.rain && <div className="scene-rain pointer-events-none absolute inset-0 opacity-70" />}
            </div>
            {LANTERNS.slice(0, mood.lanterns).map((c, n) => (
              <div key={n} className="animate-pop pointer-events-none absolute z-[953]" style={{ ...pos(c), width: `${(0.9 / GRID_W) * 100}%`, transform: "translate(-50%, -100%)" }}>
                <div className="scene-flicker absolute left-1/2 top-1/2 aspect-square w-[380%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,190,90,.55), rgba(255,150,60,.18) 45%, transparent 70%)" }} />
                <PropArt prop="lantern" />
              </div>
            ))}
          </div>
        </div>

        {/* objet montré en grand */}
        {show?.kind === "prop" && (
          <div className="animate-pop absolute inset-x-6 top-1/2 z-[1000] mx-auto max-w-xs -translate-y-1/2 rounded-[2rem] bg-[#fbf6ec] p-6 text-center shadow-2xl">
            <div className="mx-auto w-32"><PropArt prop={show.prop} /></div>
            {show.text && <p className="mt-3 font-serif text-[1.05rem] italic leading-relaxed text-zinc-700">{fill(show.text, stage.name)}</p>}
            <p className="mt-4 text-xs font-semibold text-indigo-600">Toucher pour continuer</p>
          </div>
        )}

        {/* écran noir (passage du temps, titre) */}
        <div className={`pointer-events-none absolute inset-0 z-[1100] flex items-center justify-center bg-black px-8 text-center transition-opacity duration-700 ${black ? "opacity-100" : "opacity-0"}`}>
          {black?.text && <p className="animate-pop font-serif text-2xl italic text-white/90">{black.text}</p>}
        </div>
      </div>

      {/* texte : réplique, narrateur, choix */}
      <div className="h-[15rem] shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-md">
          {show?.kind === "say" && (
            <div className="animate-pop relative rounded-[1.75rem] bg-white p-5 pt-7 shadow-xl">
              <span className="absolute -top-7 left-4 flex size-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-4 ring-white/70">
                <NpcPortrait who={show.who} size={46} />
              </span>
              <span className="eyebrow ml-14">{NPCS[show.who].name}</span>
              <p className="mt-2 min-h-[3.4rem] text-[1.05rem] font-medium leading-relaxed text-zinc-900">{full.slice(0, typed)}</p>
              <p className="mt-2 text-right text-xs font-semibold text-indigo-600">{typed < full.length ? "" : "Suite ›"}</p>
            </div>
          )}
          {show?.kind === "narrate" && (
            <div className="animate-pop rounded-[1.75rem] bg-zinc-900/90 p-5 text-center ring-1 ring-white/10">
              <p className="min-h-[3.4rem] font-serif text-[1.05rem] italic leading-relaxed text-white/90">{full.slice(0, typed)}</p>
              <p className="mt-2 text-xs font-semibold text-white/50">{typed < full.length ? "" : "Suite ›"}</p>
            </div>
          )}
          {show?.kind === "choice" && (
            <div className="animate-pop space-y-2" onClick={(e) => e.stopPropagation()}>
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-white/50">Que réponds-tu ?</p>
              {show.options.map((o) => (
                <button key={o.text} onClick={() => choose(o)} className="block w-full rounded-2xl bg-white px-4 py-3 text-left text-[0.95rem] font-semibold text-zinc-900 shadow-lg">
                  {fill(o.text, stage.name)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmoteBubble({ e }: { e: Emote }) {
  return (
    <span className="scene-emote absolute left-1/2 top-[-18%] flex size-[70%] items-center justify-center rounded-full bg-white text-[clamp(0.7rem,3.2vw,1.1rem)] font-bold shadow-md">
      {EMOJI[e]}
    </span>
  );
}

/** Un habitant en pied : son portrait sur un petit corps (Mirabelle, fantôme, flotte). */
function Body({ who, walking, facing, speaking }: { who: Who; walking: boolean; facing: 1 | -1; speaking: boolean }) {
  const color = BODY[who];
  return (
    <div className={`${walking ? "scene-hop" : who === "mirabelle" ? "scene-float" : ""} ${speaking ? "drop-shadow-[0_0_6px_rgba(255,255,255,.9)]" : ""}`}>
      <svg viewBox="0 0 64 84" className="block h-auto w-full overflow-visible" aria-hidden>
        <ellipse cx="32" cy="81" rx="15" ry="3" fill="#000" opacity={who === "mirabelle" ? 0.1 : 0.2} />
        {color && (
          <>
            <path d="M18 80c0-14 6-24 14-24s14 10 14 24z" fill={color} />
            <rect x="23" y="74" width="6" height="7" rx="2" fill="#3b2a20" />
            <rect x="35" y="74" width="6" height="7" rx="2" fill="#3b2a20" />
          </>
        )}
        <g transform={`translate(${facing === -1 ? 64 : 0} 0) scale(${facing} 1)`}>
          <g transform={color ? "translate(8 9) scale(.75)" : "translate(0 10)"}>
            <NpcPortrait who={who} size={64} />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Objets de l'histoire. */
export function PropArt({ prop }: { prop: Prop }) {
  switch (prop) {
    case "letter":
      return (
        <svg viewBox="0 0 64 48" className="h-auto w-full" aria-hidden>
          <rect x="4" y="6" width="56" height="38" rx="3" fill="#f3e6cc" stroke="#c9b28a" strokeWidth="1.5" />
          <path d="M4 8l28 20L60 8" fill="none" stroke="#c9b28a" strokeWidth="1.5" />
          <circle cx="32" cy="27" r="6" fill="#b5373b" />
          <path d="M29 27h6M32 24v6" stroke="#f6c4c4" strokeWidth="1.2" />
        </svg>
      );
    case "page":
      return (
        <svg viewBox="0 0 64 64" className="h-auto w-full" aria-hidden>
          <path d="M10 4h44v52l-5-3-4 4-5-4-4 4-5-4-4 4-5-4-4 4-4-3z" fill="#f7efdc" stroke="#cdb894" strokeWidth="1.5" transform="rotate(-4 32 32)" />
          {[14, 21, 28, 35, 42].map((y) => <path key={y} d={`M17 ${y}q8 -2 15 0t15 0`} fill="none" stroke="#7a6a8a" strokeWidth="1.3" opacity=".7" transform="rotate(-4 32 32)" />)}
          <path d="M40 46c2-3 6-3 6 0s-3 4-3 4" fill="none" stroke="#b5373b" strokeWidth="1.4" transform="rotate(-4 32 32)" />
        </svg>
      );
    case "lantern":
      return (
        <svg viewBox="0 0 32 44" className="relative h-auto w-full" aria-hidden>
          <path d="M16 1v5" stroke="#3a2a22" strokeWidth="2" />
          <circle cx="16" cy="4" r="3" fill="none" stroke="#3a2a22" strokeWidth="1.5" />
          <ellipse cx="16" cy="25" rx="14" ry="14" fill="#f08a24" />
          <path d="M16 11c-5 4-5 24 0 28M16 11c5 4 5 24 0 28M5 18c3 8 3 6 0 14M27 18c-3 8-3 6 0 14" stroke="#c96414" strokeWidth="1.4" fill="none" />
          <path d="M10 22l3 3 3-3 3 3 3-3M11 31q5 4 10 0" stroke="#ffe08a" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <rect x="12" y="8" width="8" height="4" rx="1.5" fill="#5a7a3a" />
        </svg>
      );
    case "pumpkin":
      return (
        <svg viewBox="0 0 48 40" className="h-auto w-full" aria-hidden>
          <path d="M24 9c0-4 2-7 6-8" stroke="#5a7a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="14" cy="24" rx="11" ry="14" fill="#e8741e" />
          <ellipse cx="34" cy="24" rx="11" ry="14" fill="#e8741e" />
          <ellipse cx="24" cy="24" rx="10" ry="15" fill="#f28c2b" />
        </svg>
      );
    case "satchel":
      return (
        <svg viewBox="0 0 64 56" className="h-auto w-full" aria-hidden>
          <path d="M12 18C12 4 52 4 52 18" fill="none" stroke="#6a4424" strokeWidth="4" />
          <rect x="6" y="18" width="52" height="34" rx="6" fill="#9a6232" />
          <path d="M6 24h52v8c-10 6-42 6-52 0z" fill="#7d4e26" />
          <rect x="28" y="28" width="8" height="8" rx="2" fill="#e0b44c" />
          <text x="32" y="47" textAnchor="middle" fontSize="7" fill="#f3e6cc" fontFamily="serif">POSTES</text>
        </svg>
      );
    case "candle":
      return (
        <svg viewBox="0 0 32 56" className="h-auto w-full" aria-hidden>
          <path d="M16 4c4 6 4 10 0 12-4-2-4-6 0-12z" fill="#ffbf4a" />
          <rect x="9" y="18" width="14" height="34" rx="3" fill="#f4efe6" stroke="#d6cdbd" />
        </svg>
      );
    case "cake":
      return (
        <svg viewBox="0 0 56 44" className="h-auto w-full" aria-hidden>
          <rect x="6" y="18" width="44" height="22" rx="4" fill="#f3c9a8" />
          <path d="M6 22c6 5 10 5 15 0s10 5 15 0 10 5 14 0v-4H6z" fill="#fff4ea" />
          <circle cx="28" cy="12" r="5" fill="#d9363e" />
        </svg>
      );
    case "key":
      return (
        <svg viewBox="0 0 64 32" className="h-auto w-full" aria-hidden>
          <circle cx="14" cy="16" r="10" fill="none" stroke="#c99a2a" strokeWidth="5" />
          <path d="M24 16h34M50 16v8M42 16v6" stroke="#c99a2a" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
  }
}
