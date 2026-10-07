"use client";

import { useState } from "react";
import type { BoardProps } from "./labels";
import {
  buildGrid, EDGES, H, mix, PIECES, pieceCells, trace, W,
  type Cell, type Color, type Grid, type LogEntry, type OrapaState, type Shape,
} from "./orapa";

// Plateau sombre inspiré de github.com/TheApo/orapa : repères colorés par le résultat, tracé de l'onde.
const HEX: Record<Color, string> = {
  red: "#e74c3c", yellow: "#f1c40f", blue: "#3498db", white: "#ecf0f1", clear: "rgba(189,195,199,0.45)", black: "#1d1d1d",
};
const POLY: Record<Shape, string> = { sq: "0,0 1,0 1,1 0,1", nw: "0,0 1,0 0,1", ne: "0,0 1,0 1,1", sw: "0,0 0,1 1,1", se: "1,0 1,1 0,1" };
const ABSORBED = "#0f172a";

/** Texte lisible sur un fond de cette couleur. */
function ink(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l > 150 ? "#0f172a" : "#fff";
}

function Gem({ cell }: { cell: Cell }) {
  if (!cell) return null;
  return (
    <svg viewBox="0 0 1 1" className="size-full">
      <polygon points={POLY[cell.s]} fill={HEX[cell.c]} stroke={cell.c === "black" ? "#64748b" : "rgba(15,23,42,.35)"} strokeWidth={0.03} />
    </svg>
  );
}

function PieceIcon({ k, rot, size = 14 }: { k: number; rot: number; size?: number }) {
  const cells = pieceCells(k, rot);
  const w = Math.max(...cells.map((c) => c[0])) + 1, h = Math.max(...cells.map((c) => c[1])) + 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w * size} height={h * size}>
      {cells.map(([x, y, sh], i) => (
        <polygon key={i} points={POLY[sh]} transform={`translate(${x} ${y})`} fill={HEX[PIECES[k].color]} stroke="#94a3b8" strokeWidth={0.05} />
      ))}
    </svg>
  );
}

type Wave = Extract<LogEntry, { from: string }>;
const result = (w: { to: string | null; colors: Color[] }) =>
  w.to === null ? { hex: ABSORBED, name: "absorbée" } : mix(w.colors);
const same = (a: { to: string | null; colors: Color[] }, b: { to: string | null; colors: Color[] }) =>
  a.to === b.to && a.colors.join() === b.colors.join();

// ---------- Placement des gemmes (sa grille secrète, ou son hypothèse sur celle de l'adversaire) ----------

type Placement = { x: number; y: number; rot: number; on: boolean };

/** Grille et propriétaire de chaque case pour les gemmes posées (hors `skip`). */
function layout(pl: Placement[], skip = -1) {
  const grid: Grid = Array(W * H).fill(null);
  const owner: number[] = Array(W * H).fill(-1);
  pl.forEach((p, k) => {
    if (!p.on || k === skip) return;
    pieceCells(k, p.rot, p.x, p.y).forEach(([x, y, sh]) => {
      grid[y * W + x] = { s: sh, c: PIECES[k].color };
      owner[y * W + x] = k;
    });
  });
  return { grid, owner };
}

const size = (k: number, rot: number) => {
  const cells = pieceCells(k, rot);
  return { w: Math.max(...cells.map((c) => c[0])) + 1, h: Math.max(...cells.map((c) => c[1])) + 1 };
};

// ponytail: placements gardés en mémoire seulement (perdus au rechargement) ; les stocker si ça gêne.
function usePlacement() {
  const [pl, setPl] = useState<Placement[]>(() => PIECES.map(() => ({ x: 0, y: 0, rot: 0, on: false })));
  const [cur, setCur] = useState<number | null>(0);
  const { grid, owner } = layout(pl);

  // Pose si la gemme reste dans la grille sans en chevaucher une autre.
  function update(k: number, p: Placement) {
    const others = layout(pl, k).owner;
    const ok = pieceCells(k, p.rot, p.x, p.y).every(([x, y]) => x >= 0 && y >= 0 && x < W && y < H && others[y * W + x] < 0);
    if (ok) setPl(pl.map((q, i) => (i === k ? p : q)));
  }

  return {
    pl, cur, setCur, grid, owner,
    any: pl.some((p) => p.on),
    allPlaced: pl.every((p) => p.on),
    left: pl.filter((p) => !p.on).length,
    placements: pl.map(({ x, y, rot }) => ({ x, y, rot })),
    // Toucher une gemme posée la sélectionne ; toucher une case libre y pose la gemme sélectionnée.
    tap(x: number, y: number) {
      const o = owner[y * W + x];
      if (o >= 0 && o !== cur) return setCur(o);
      if (cur === null) return;
      const { w, h } = size(cur, pl[cur].rot);
      update(cur, { ...pl[cur], x: Math.min(x, W - w), y: Math.min(y, H - h), on: true });
    },
    turn() {
      if (cur === null) return;
      const p = pl[cur], rot = (p.rot + 1) % 4;
      if (!p.on) return setPl(pl.map((q, i) => (i === cur ? { ...q, rot } : q)));
      const { w, h } = size(cur, rot);
      update(cur, { ...p, rot, x: Math.min(p.x, W - w), y: Math.min(p.y, H - h) });
    },
    remove() {
      if (cur !== null) setPl(pl.map((q, i) => (i === cur ? { ...q, on: false } : q)));
    },
  };
}

function Tray({ ed }: { ed: ReturnType<typeof usePlacement> }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PIECES.map((p, k) => (
          <button
            key={p.name}
            onClick={() => ed.setCur(k)}
            aria-label={p.name}
            aria-pressed={ed.cur === k}
            className={`flex h-16 min-w-16 shrink-0 items-center justify-center rounded-2xl px-2 transition ${
              ed.cur === k ? "bg-indigo-50 ring-2 ring-indigo-500" : "bg-zinc-100"
            } ${ed.pl[k].on && ed.cur !== k ? "opacity-35" : ""}`}
          >
            <PieceIcon k={k} rot={ed.pl[k].rot} />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={ed.turn} disabled={ed.cur === null} className="btn-soft flex-1">Tourner</button>
        <button onClick={ed.remove} disabled={ed.cur === null || !ed.pl[ed.cur].on} className="btn-soft flex-1">Retirer</button>
      </div>
    </div>
  );
}

// ---------- Plateau : grille + 36 repères + tracé ----------

function Plateau({ grid, onCell, selected, onEdge, waves = [], active, path, pathOk = true, faded }: {
  grid: Grid;
  onCell?: (x: number, y: number) => void;
  selected?: (i: number) => boolean;
  onEdge?: (id: string) => void;
  waves?: Wave[]; // résultats observés : colorent leurs repères
  active?: Wave | null;
  path?: [number, number][] | null;
  pathOk?: boolean; // le tracé (sur l'hypothèse) donne-t-il le résultat observé ?
  faded?: (w: Wave) => boolean; // ondes déjà expliquées par l'hypothèse : repères estompés
}) {
  const ports = new Map<string, { hex: string; dim: boolean }>();
  for (const w of waves) {
    const r = { hex: result(w).hex, dim: !!faded?.(w) };
    ports.set(w.from, r);
    if (w.to) ports.set(w.to, r);
  }
  const color = active ? result(active).hex : "#fff";

  const edge = (side: string, i: number) => {
    const id = EDGES.find((e) => e.side === side && e.i === i)!.id;
    const port = ports.get(id);
    const on = active && (active.from === id || active.to === id);
    return (
      <button
        key={id}
        disabled={!onEdge}
        onClick={() => onEdge?.(id)}
        aria-label={`Envoyer une onde depuis ${id}`}
        className={`m-[2px] flex items-center justify-center rounded-md text-[9px] font-bold tracking-tight transition ${
          on ? "ring-2 ring-amber-300" : ""
        } ${port?.dim ? "opacity-30" : ""} ${onEdge ? "hover:brightness-125" : ""}`}
        style={{ background: port?.hex ?? (onEdge ? "#475569" : "#334155"), color: port ? ink(port.hex === ABSORBED ? "#000000" : port.hex) : "#cbd5e1" }}
      >
        {id}
      </button>
    );
  };

  return (
    <div className="relative rounded-2xl bg-slate-800 p-1.5 shadow-inner">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${W + 2}, minmax(0, 1fr))`, gridAutoRows: "1fr" }}>
        <span className="aspect-square" />
        {Array.from({ length: W }, (_, x) => edge("N", x))}
        <span />
        {Array.from({ length: H }, (_, y) => [
          edge("W", y),
          ...Array.from({ length: W }, (_, x) => (
            <button
              key={`c${x}-${y}`}
              disabled={!onCell}
              onClick={() => onCell?.(x, y)}
              aria-label={`Case ${x + 1}, ${y + 1}`}
              className={`aspect-square shadow-[inset_0_0_0_0.5px_#475569] ${selected?.(y * W + x) ? "bg-slate-600" : "bg-slate-700/80"}`}
            >
              <Gem cell={grid[y * W + x]} />
            </button>
          )),
          edge("E", y),
        ])}
        <span />
        {Array.from({ length: W }, (_, x) => edge("S", x))}
        <span />
      </div>
      {path && (
        <svg className="pointer-events-none absolute inset-1.5" viewBox={`0 0 ${W + 2} ${H + 2}`} preserveAspectRatio="none" aria-hidden>
          <polyline
            points={path.map(([x, y]) => `${x + 1.5},${y + 1.5}`).join(" ")}
            fill="none"
            stroke={color === ABSORBED ? "#f8fafc" : color}
            strokeWidth={0.13}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={pathOk ? undefined : "0.25 0.2"}
          />
        </svg>
      )}
    </div>
  );
}

function WaveLog({ entries, name, active, onSel, check }: {
  entries: { e: LogEntry; k: number }[];
  name: (id: string) => string;
  active: Wave | null;
  onSel: (k: number) => void;
  check?: (w: Wave) => boolean | null; // vrai si l'hypothèse explique cette onde, null si pas d'hypothèse
}) {
  if (!entries.length) return <p className="py-2 text-sm text-zinc-500">Aucune onde pour l&apos;instant.</p>;
  return (
    <ol className="rows">
      {entries.map(({ e, k }, n) => {
        if (!("from" in e))
          return (
            <li key={k} className="py-2 text-sm text-zinc-500">
              <span className="mr-3 inline-block w-5 text-right tabular-nums text-zinc-400">{n + 1}</span>
              {name(e.by)} a vérifié une grille : fausse
            </li>
          );
        const r = result(e);
        const ok = check?.(e);
        return (
          <li key={k}>
            <button onClick={() => onSel(k)} className={`flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left text-sm transition ${active === e ? "bg-indigo-50" : ""}`}>
              <span className="w-5 text-right tabular-nums text-zinc-400">{n + 1}</span>
              <span className="font-semibold tabular-nums">{e.from} → {e.to ?? "·"}</span>
              <span className="inline-flex items-center gap-1.5 text-zinc-600">
                <span className="size-3 rounded-full ring-1 ring-black/10" style={{ background: r.hex }} />
                {r.name}
              </span>
              {ok != null && <span className={`ml-auto text-xs font-semibold ${ok ? "text-green-600" : "text-zinc-400"}`}>{ok ? "✓ expliquée" : "pas encore"}</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

const Rules = () => (
  <details className="text-sm">
    <summary className="cursor-pointer font-medium text-zinc-600">Règles</summary>
    <p className="mt-2 leading-6 text-zinc-600">
      Chacun cache ses 6 gemmes (elles ne se touchent pas par un côté). Ensuite, à ton tour, touche un repère du bord pour
      envoyer une onde dans la grille adverse : elle avance tout droit, fait demi-tour sur un côté droit, tourne d&apos;un
      quart sur une diagonale, prend la couleur des gemmes touchées (les couleurs se mélangent) et ressort. La gemme
      transparente dévie sans colorer, le bloc noir absorbe. Vérifie ta déduction quand tu veux : ça ne fait pas passer le
      tour. Le premier qui trouve gagne.
    </p>
  </details>
);

// ---------- Plateau du jeu ----------

export function OrapaBoard({ state, userId, myTurn, name, play, priv }: BoardProps) {
  const s = state as unknown as OrapaState;
  const setup = usePlacement();
  const guess = usePlacement();
  const [tab, setTab] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [error, setError] = useState("");

  if (!s.ready) return <p className="text-center text-sm text-zinc-500">Partie d&apos;une ancienne version : abandonne-la et relance un défi.</p>;

  const isPlayer = s.players.includes(userId);
  const [p0, p1] = isPlayer ? [userId, s.players.find((p) => p !== userId)!] : s.players;

  // 1. Préparation : chacun compose sa grille secrète.
  if (s.phase === "setup") {
    if (!isPlayer || s.ready.includes(userId))
      return (
        <div className="space-y-4">
          <div className="rows text-sm">
            {s.players.map((p) => (
              <p key={p} className="flex justify-between py-2.5">
                <span>{name(p)}</span>
                <span className={s.ready.includes(p) ? "font-semibold text-green-600" : "text-zinc-500"}>
                  {s.ready.includes(p) ? "grille prête" : "compose sa grille…"}
                </span>
              </p>
            ))}
          </div>
          <Rules />
        </div>
      );
    async function submit() {
      if (!buildGrid(setup.placements)) return setError("Deux gemmes ne doivent pas se toucher par un côté.");
      setError("");
      await play({ kind: "setup", placements: setup.placements });
    }
    return (
      <div className="space-y-4">
        <Plateau grid={setup.grid} onCell={setup.tap} selected={(i) => setup.cur !== null && setup.owner[i] === setup.cur} />
        <Tray ed={setup} />
        {error && <p role="alert" className="text-center text-sm text-red-700">{error}</p>}
        <button disabled={!setup.allPlaced} onClick={submit} className="btn w-full">
          {setup.allPlaced ? "Valider ma grille" : `Pose encore ${setup.left} gemme${setup.left > 1 ? "s" : ""}`}
        </button>
        <Rules />
      </div>
    );
  }

  // 2. Jeu : onglet 0 = grille de l'adversaire (à deviner), onglet 1 = sa propre grille.
  // Pour un spectateur : onglet 0 = grille de p1 (ondes de p0), onglet 1 = grille de p0 (ondes de p1).
  const owner = tab === 0 ? p1 : p0; // à qui appartient la grille affichée
  const shooter = tab === 0 ? p0 : p1; // qui y envoie des ondes
  const entries = s.log.map((e, k) => ({ e, k })).filter(({ e }) => e.by === shooter);
  const waves = entries.flatMap(({ e }) => ("from" in e ? [e] : []));
  const picked = sel !== null && s.log[sel]?.by === shooter ? s.log[sel] : waves.at(-1);
  const active = picked && "from" in picked ? picked : null;
  const solution = s.solutions?.[owner] ?? null;
  const guessing = isPlayer && tab === 0 && !solution;
  const known = solution ?? (isPlayer && tab === 1 ? (priv as Grid | null) : null); // grille réelle, si on la connaît
  const grid = known ?? (guessing ? guess.grid : Array(W * H).fill(null));

  // Tracé de l'onde sélectionnée : exact sur une grille connue, sinon tel que l'hypothèse le prédit.
  const traced = active && (known ? trace(known, active.from) : guessing && guess.any ? trace(guess.grid, active.from) : null);
  const check = guessing && guess.any ? (w: Wave) => same(trace(guess.grid, w.from), w) : undefined;
  const tabs = isPlayer ? [`Grille de ${name(p1)}`, "Ma grille"] : [`Grille de ${name(p1)}`, `Grille de ${name(p0)}`];
  const r = active && result(active);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-zinc-100 p-1 text-sm font-medium">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => { setTab(i); setSel(null); }} className={`rounded-full py-1.5 transition ${tab === i ? "bg-white shadow-sm" : "text-zinc-500"}`}>
            {t}
          </button>
        ))}
      </div>

      <p className="flex min-h-7 items-center justify-center gap-2 text-sm">
        {active && r ? (
          <>
            <span className="font-semibold tabular-nums">{active.from}</span>→
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-white">
              <span className="size-2.5 rounded-full" style={{ background: r.hex === ABSORBED ? "#fff" : r.hex }} />
              {r.name}
            </span>
            → <span className="font-semibold tabular-nums">{active.to ?? "·"}</span>
            {check && <span className={`text-xs font-semibold ${check(active) ? "text-green-600" : "text-amber-600"}`}>{check(active) ? "✓" : "≠ ta grille"}</span>}
          </>
        ) : null}
      </p>

      <Plateau
        grid={grid}
        onCell={guessing ? guess.tap : undefined}
        selected={(i) => guessing && guess.cur !== null && guess.owner[i] === guess.cur}
        onEdge={myTurn && tab === 0 ? (from) => play({ kind: "wave", from }) : undefined}
        waves={waves}
        active={active}
        path={traced?.path}
        pathOk={!check || !active || check(active)}
        faded={check}
      />

      {solution && <p className="text-center text-sm font-medium">Grille révélée.</p>}
      {guessing && (
        <>
          <Tray ed={guess} />
          <button disabled={!guess.allPlaced} onClick={() => play({ kind: "guess", grid: guess.grid })} className="btn w-full">
            {guess.allPlaced ? "Vérifier ma grille" : `Pose encore ${guess.left} gemme${guess.left > 1 ? "s" : ""} pour vérifier`}
          </button>
        </>
      )}

      <section>
        <h3 className="eyebrow mb-1">{shooter === userId ? "Tes ondes" : `Ondes de ${name(shooter)}`}</h3>
        <WaveLog entries={entries} name={name} active={active} onSel={setSel} check={check} />
      </section>
      <Rules />
    </div>
  );
}
