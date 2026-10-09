"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { BoardProps } from "./labels";
import {
  centerAt, EDGES, gridProblems, H, mix, PIECES, pieceCells, placementError, rotateInPlace, trace, W, type Problem,
  type Cell, type Color, type Grid, type LogEntry, type OrapaState, type Placement, type Shape,
} from "./orapa";

// Plateau sombre inspiré de github.com/TheApo/orapa : repères colorés par le résultat.
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

function PieceIcon({ k, rot = 0, size = 14 }: { k: number; rot?: number; size?: number }) {
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

// ---------- Éditeur : gemmes posées et croix, gardées sur l'appareil ----------

type Draft = { placed: (Placement | null)[]; crosses: number[] };
const emptyDraft = (): Draft => ({ placed: PIECES.map(() => null), crosses: [] });

function loadDraft(key: string): Draft {
  try {
    const d = JSON.parse(localStorage.getItem(key) ?? "null") as Draft | null;
    if (d && Array.isArray(d.placed) && d.placed.length === PIECES.length && Array.isArray(d.crosses)) return d;
  } catch {}
  return emptyDraft();
}

/** Grille et propriétaire de chaque case pour les gemmes posées. */
function layout(placed: (Placement | null)[]) {
  const grid: Grid = Array(W * H).fill(null);
  const owner: number[] = Array(W * H).fill(-1);
  placed.forEach((p, k) => {
    if (!p) return;
    pieceCells(k, p.rot, p.x, p.y).forEach(([x, y, sh]) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      grid[y * W + x] = { s: sh, c: PIECES[k].color };
      owner[y * W + x] = k;
    });
  });
  return { grid, owner };
}

/** Brouillon d'une grille (sa grille secrète ou son hypothèse), sauvegardé à chaque changement. */
function useDraft(key: string) {
  const [d, setD] = useState<Draft>(() => loadDraft(key)); // monté seulement côté navigateur (voir OrapaBoard)
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(d));
    } catch {}
  }, [key, d]);
  const { grid, owner } = layout(d.placed);

  /** Pose (ou déplace) la gemme k ; refusé si elle chevauche ou sort. Les croix sous la gemme disparaissent. */
  function place(k: number, p: Placement) {
    if (placementError(d.placed, k, p)) return false;
    const covered = new Set(pieceCells(k, p.rot, p.x, p.y).map(([x, y]) => y * W + x));
    setD({ placed: d.placed.map((q, i) => (i === k ? p : q)), crosses: d.crosses.filter((c) => !covered.has(c)) });
    return true;
  }
  return {
    ...d, grid, owner, place,
    left: d.placed.filter((p) => !p).length,
    any: d.placed.some(Boolean),
    remove: (k: number) => setD({ ...d, placed: d.placed.map((q, i) => (i === k ? null : q)) }),
    rotate: (k: number) => d.placed[k] && place(k, rotateInPlace(k, d.placed[k]!)),
    toggleCross: (i: number) =>
      owner[i] < 0 && setD({ ...d, crosses: d.crosses.includes(i) ? d.crosses.filter((c) => c !== i) : [...d.crosses, i] }),
  };
}
type Editor = ReturnType<typeof useDraft>;

// ---------- Plateau : grille + 36 repères ----------

type Ghost = { k: number; p: Placement; ok: boolean };

function Plateau({ grid, crosses, ghost, bad, boardRef, onCellDown, onEdge, waves = [], active, faded }: {
  grid: Grid;
  bad?: number[]; // cases en cause quand la grille est refusée
  crosses?: number[];
  ghost?: Ghost | null; // gemme en cours de glisser
  boardRef?: React.Ref<HTMLDivElement>;
  onCellDown?: (x: number, y: number, e: React.PointerEvent) => void;
  onEdge?: (id: string) => void;
  waves?: Wave[]; // résultats observés : colorent leurs repères
  active?: Wave | null;
  faded?: (w: Wave) => boolean; // ondes déjà expliquées par l'hypothèse : repères estompés
}) {
  const ports = new Map<string, { hex: string; dim: boolean }>();
  for (const w of waves) {
    const r = { hex: result(w).hex, dim: !!faded?.(w) };
    ports.set(w.from, r);
    if (w.to) ports.set(w.to, r);
  }
  const ghostCells = new Map(ghost ? pieceCells(ghost.k, ghost.p.rot, ghost.p.x, ghost.p.y).map(([x, y, s]) => [y * W + x, s] as const) : []);

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
    <div className="rounded-2xl bg-slate-800 p-1.5 shadow-inner">
      <div ref={boardRef} className="grid select-none" style={{ gridTemplateColumns: `repeat(${W + 2}, minmax(0, 1fr))`, gridAutoRows: "1fr", touchAction: onCellDown ? "none" : undefined }}>
        <span className="aspect-square" />
        {Array.from({ length: W }, (_, x) => edge("N", x))}
        <span />
        {Array.from({ length: H }, (_, y) => [
          edge("W", y),
          ...Array.from({ length: W }, (_, x) => {
            const i = y * W + x;
            const g = ghostCells.get(i);
            return (
              <div
                key={`c${x}-${y}`}
                onPointerDown={onCellDown ? (e) => onCellDown(x, y, e) : undefined}
                className={`relative aspect-square shadow-[inset_0_0_0_0.5px_#475569] ${bad?.includes(i) ? "bg-red-500/50 ring-2 ring-inset ring-red-400" : "bg-slate-700/80"}`}
              >
                <Gem cell={grid[i]} />
                {!grid[i] && crosses?.includes(i) && (
                  <svg viewBox="0 0 1 1" className="absolute inset-0 size-full" aria-label="Case vide">
                    <path d="M.3.3l.4.4M.7.3l-.4.4" stroke="#94a3b8" strokeWidth=".08" strokeLinecap="round" />
                  </svg>
                )}
                {g && ghost && (
                  <svg viewBox="0 0 1 1" className="pointer-events-none absolute inset-0 size-full opacity-80">
                    <polygon points={POLY[g]} fill={HEX[PIECES[ghost.k].color]} stroke={ghost.ok ? "#4ade80" : "#f87171"} strokeWidth={0.1} />
                  </svg>
                )}
              </div>
            );
          }),
          edge("E", y),
        ])}
        <span />
        {Array.from({ length: W }, (_, x) => edge("S", x))}
        <span />
      </div>
    </div>
  );
}

/**
 * Plateau éditable : glisser une gemme de la réserve pour la poser (centrée sous le doigt),
 * toucher une gemme pour la tourner, la glisser pour la déplacer (hors du plateau = retour en réserve),
 * outil Croix pour marquer les cases vides.
 */
function EditableBoard({ ed, plateau }: { ed: Editor; plateau?: Omit<React.ComponentProps<typeof Plateau>, "grid"> }) {
  const board = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<"gems" | "cross">("gems");
  const [cur, setCur] = useState<number | null>(null); // gemme choisie dans la réserve (pour la poser d'un toucher)
  const [ghost, setGhost] = useState<Ghost | null>(null);

  /** Case du plateau sous le doigt (null hors du plateau). */
  function cellAt(clientX: number, clientY: number) {
    const r = board.current!.getBoundingClientRect();
    const col = Math.floor(((clientX - r.left) / r.width) * (W + 2)) - 1;
    const row = Math.floor(((clientY - r.top) / r.height) * (H + 2)) - 1;
    return col >= 0 && row >= 0 && col < W && row < H ? { x: col, y: row } : null;
  }

  /** Suit le doigt ; au lâcher : pose (si possible) ou retire (si lâchée hors du plateau). `tap` si le doigt n'a pas bougé. */
  function drag(k: number, rot: number, e: React.PointerEvent, tap: () => void) {
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false, last: Ghost | null = null;
    const others = ed.placed.map((q, i) => (i === k ? null : q));
    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
      moved = true;
      const c = cellAt(ev.clientX, ev.clientY);
      const p = c ? centerAt(k, rot, c.x, c.y) : null;
      last = p ? { k, p, ok: !placementError(others, k, p) } : null;
      setGhost(last);
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setGhost(null);
      if (!moved) return tap();
      if (last?.ok) ed.place(k, last.p);
      else if (!cellAt(ev.clientX, ev.clientY) && ed.placed[k]) ed.remove(k); // lâchée hors du plateau
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function onCellDown(x: number, y: number, e: React.PointerEvent) {
    const i = y * W + x;
    const k = ed.owner[i];
    if (tool === "cross") return k < 0 && ed.toggleCross(i);
    if (k >= 0) return drag(k, ed.placed[k]!.rot, e, () => ed.rotate(k)); // toucher = tourner, glisser = déplacer
    if (cur !== null && !ed.placed[cur] && ed.place(cur, centerAt(cur, 0, x, y))) setCur(null);
  }

  const tray = PIECES.map((p, k) => ({ p, k })).filter(({ k }) => !ed.placed[k]);
  return (
    <div className="space-y-3">
      <Plateau grid={ed.grid} crosses={ed.crosses} ghost={ghost} boardRef={board} onCellDown={onCellDown} {...plateau} />
      <div className="grid grid-cols-2 gap-1 rounded-full bg-zinc-100 p-1 text-sm font-medium">
        {(["gems", "cross"] as const).map((t) => (
          <button key={t} onClick={() => setTool(t)} className={`rounded-full py-1.5 transition ${tool === t ? "bg-white shadow-sm" : "text-zinc-500"}`}>
            {t === "gems" ? "Gemmes" : "Croix"}
          </button>
        ))}
      </div>
      {tray.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2" data-no-swipe>
          {tray.map(({ p, k }) => (
            <button
              key={p.name}
              aria-label={p.name}
              aria-pressed={cur === k}
              onPointerDown={(e) => drag(k, 0, e, () => setCur(cur === k ? null : k))}
              className={`flex h-16 min-w-16 shrink-0 touch-none items-center justify-center rounded-2xl px-2 transition ${cur === k ? "bg-indigo-50 ring-2 ring-indigo-500" : "bg-zinc-100"}`}
            >
              <PieceIcon k={k} />
            </button>
          ))}
        </div>
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
      Chacun cache ses 7 gemmes (une pointe peut toucher une pointe ou un côté droit, mais deux côtés droits ne se touchent pas, et le bloc noir ne touche aucune gemme). Ensuite, à ton tour, touche un repère du bord pour
      envoyer une onde dans la grille adverse : elle avance tout droit, fait demi-tour sur un côté droit, tourne d&apos;un
      quart sur une diagonale, prend la couleur des gemmes touchées (les couleurs se mélangent) et ressort. La gemme
      transparente dévie sans colorer, le bloc noir absorbe. Vérifie ta déduction quand tu veux : ça ne fait pas passer le
      tour. Le premier qui trouve gagne.
    </p>
  </details>
);

// ---------- Plateau du jeu ----------

const noop = () => () => {};

/** Les brouillons viennent de l'appareil : le plateau ne s'affiche qu'une fois la page chargée côté navigateur. */
export function OrapaBoard(props: BoardProps) {
  const ready = useSyncExternalStore(noop, () => true, () => false);
  if (!ready) return <div className="aspect-[10/12] animate-pulse rounded-2xl bg-slate-800/80" />;
  return <OrapaGame {...props} />;
}

function OrapaGame({ gameId, state, userId, myTurn, name, play, priv }: BoardProps) {
  const s = state as unknown as OrapaState;
  const setup = useDraft(`orapa:${gameId}:setup`);
  const guess = useDraft(`orapa:${gameId}:guess`);
  const [tab, setTab] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [problems, setProblems] = useState<{ at: string; found: Problem[] } | null>(null);
  const shown = problems && problems.at === JSON.stringify(setup.placed) ? problems : null; // s'efface dès qu'on touche à la grille

  if (!s.ready || s.players.length !== 2) return <p className="text-center text-sm text-zinc-500">Partie d&apos;une ancienne version : abandonne-la et relance un défi.</p>;

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
      const placements = setup.placed as Placement[];
      const found = gridProblems(placements);
      if (found.length) return setProblems({ at: JSON.stringify(placements), found });
      setProblems(null);
      await play({ kind: "setup", placements });
    }
    return (
      <div className="space-y-4">
        <EditableBoard ed={setup} plateau={{ bad: shown?.found.flatMap((f) => f.cells) }} />
        {shown && (
          <div role="alert" className="space-y-1 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">Ta grille n&apos;est pas valide : les cases en cause sont en rouge.</p>
            <ul className="list-disc pl-5">{shown.found.map((f) => <li key={f.text}>{f.text}</li>)}</ul>
          </div>
        )}
        <button disabled={setup.left > 0} onClick={submit} className="btn w-full">
          {setup.left ? `Pose encore ${setup.left} gemme${setup.left > 1 ? "s" : ""}` : "Valider ma grille"}
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

  // L'hypothèse explique-t-elle chaque onde observée ? (calcul seulement, rien n'est dessiné)
  const check = guessing && guess.any ? (w: Wave) => same(trace(guess.grid, w.from), w) : undefined;
  const tabs = isPlayer ? [`Grille de ${name(p1)}`, "Ma grille"] : [`Grille de ${name(p1)}`, `Grille de ${name(p0)}`];
  const r = active && result(active);
  const ports = {
    onEdge: myTurn && tab === 0 ? (from: string) => play({ kind: "wave", from }) : undefined,
    waves, active, faded: check,
  };

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

      {guessing ? (
        <>
          <EditableBoard ed={guess} plateau={ports} />
          <button disabled={guess.left > 0} onClick={() => play({ kind: "guess", grid: guess.grid })} className="btn w-full">
            {guess.left ? `Pose encore ${guess.left} gemme${guess.left > 1 ? "s" : ""} pour vérifier` : "Vérifier ma grille"}
          </button>
        </>
      ) : (
        <Plateau grid={known ?? Array(W * H).fill(null)} {...ports} />
      )}
      {solution && <p className="text-center text-sm font-medium">Grille révélée.</p>}

      <section>
        <h3 className="eyebrow mb-1">{shooter === userId ? "Tes ondes" : `Ondes de ${name(shooter)}`}</h3>
        <WaveLog entries={entries} name={name} active={active} onSel={setSel} check={check} />
      </section>
      <Rules />
    </div>
  );
}
