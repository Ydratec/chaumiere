"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { CharacterSprite } from "@/src/components/character-sprite";
import type { Character } from "@/src/modules/characters/catalog";
import { farmAction, moveCat, openGift, type FarmMove } from "./actions";
import { foundSecret } from "./story/actions";
import { GiftArt, ItemIcon, ObjectArt } from "./art";
import { GreenhouseFloor, GreenhouseLight, GreenhouseWall } from "./greenhouse";
import { BUILDINGS, GRID_W, ITEMS, isItem, type BuildingId, type Inventory, type ItemId } from "./catalog";
import type { Farm, Gift } from "./data";
import {
  applyMove, around, duration, findPath, footprint, gridH, has, isReady, owned, placeError, progress, recipeOf, sellPrice, sizeOf, tileAt,
  type Cell, type Tile,
} from "./rules";

const STEP_MS = 170; // durée d'un pas du chat
const WANDER_MS = 6000; // le chat se promène après ce temps sans rien faire

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
  if (s >= 60) return `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60} s` : ""}`;
  return `${s} s`;
};

function Cost({ need, have }: { need: Inventory; have: Inventory }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      {(Object.entries(need) as [ItemId, number][]).map(([k, v]) => (
        <span key={k} className={`inline-flex items-center gap-0.5 ${(have[k] ?? 0) < v ? "text-red-600" : "text-zinc-600"}`}>
          <ItemIcon id={k} size={14} />
          {v}
        </span>
      ))}
    </span>
  );
}

type Placing = { kind: BuildingId; moving?: Tile };

/** Sa serre (ou celle d'un ami en lecture seule, avec `owner`). Le chat se déplace en touchant le sol. */
export function FarmView({ roomId, initial, character, owner, names }: { roomId: string; initial: Farm; character: Character; owner?: string; names: Record<string, string> }) {
  const [farm, setFarm] = useState(initial);
  const [now, setNow] = useState(initial.now);
  const [cat, setCat] = useState<Cell>(initial.cat);
  const [facing, setFacing] = useState(1); // 1 = vers la droite
  const [walking, setWalking] = useState(false);
  const [open, setOpen] = useState<Tile | "build" | null>(null); // feuille d'actions
  const [placing, setPlacing] = useState<Placing | null>(null);
  const [ghost, setGhost] = useState<Cell | null>(null);
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState(""); // bonne nouvelle (secret trouvé…)
  const catTaps = useRef({ n: 0, at: 0 });
  // Cadeaux : la fenêtre s'ouvre toute seule s'il y en a un à ouvrir (« Plus tard » la ferme jusqu'au prochain toucher).
  const [giftShown, setGiftShown] = useState(true);
  const [giftFocus, setGiftFocus] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Gift | null>(null);
  const waiting = farm.gifts.find((g) => g.id === giftFocus) ?? farm.gifts[0];
  const [pending, startTransition] = useTransition();
  const walk = useRef<ReturnType<typeof setTimeout> | null>(null);
  const world = useRef<HTMLDivElement>(null);
  const H = gridH(farm.unlocks);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(id);
      if (walk.current) clearTimeout(walk.current);
    };
  }, []);

  // Le coup s'affiche tout de suite (mêmes règles que le serveur), puis l'état du serveur fait foi.
  // Tant que d'autres coups sont en route, on garde l'affichage prévu (pas de retour en arrière visuel).
  const inflight = useRef(0);
  function act(move: FarmMove, close = true) {
    const predicted = applyMove(farm, move, now); // même horloge que l'affichage
    if ("error" in predicted) return setMsg(predicted.error);
    setFarm((f) => ({ ...f, ...predicted.state }));
    setMsg("");
    if (close) setOpen(null);
    inflight.current++;
    startTransition(async () => {
      const res = await farmAction(roomId, move);
      inflight.current--;
      if (res.error || inflight.current === 0) setFarm(res.farm);
      if (res.error) setMsg(res.error);
      if (res.notice) setNotice(res.notice);
    });
  }

  /** Fait marcher le chat jusqu'à l'une des cases `goals`, puis appelle `then`. `save` : enregistrer où il s'arrête. */
  function walkTo(goals: Cell[], then?: () => void, save = !owner) {
    if (walk.current) clearTimeout(walk.current);
    const path = findPath(farm.tiles, H, cat, goals);
    if (!path) return setMsg("Ton chat ne peut pas y aller.");
    setMsg("");
    setWalking(path.length > 0);
    let here = cat;
    const step = (i: number) => {
      if (i >= path.length) {
        walk.current = null;
        setWalking(false);
        if (path.length && save) void moveCat(roomId, here.x, here.y);
        return then?.();
      }
      const next = path[i];
      if (next.x !== here.x) setFacing(next.x > here.x ? 1 : -1);
      here = next;
      setCat(next);
      walk.current = setTimeout(() => step(i + 1), STEP_MS);
    };
    step(0);
  }

  // Quand on ne fait rien, le chat fait quelques pas au hasard (sans enregistrer sa position).
  const wander = useEffectEvent(() => {
    if (walk.current || open || placing) return;
    const near: Cell[] = [];
    for (let dx = -3; dx <= 3; dx++)
      for (let dy = -2; dy <= 2; dy++) {
        const c = { x: cat.x + dx, y: cat.y + dy };
        if ((dx || dy) && c.x >= 0 && c.y >= 0 && c.x < GRID_W && c.y < H && !tileAt(farm.tiles, c.x, c.y)) near.push(c);
      }
    if (near.length) walkTo([near[Math.floor(Math.random() * near.length)]], undefined, false);
  });
  useEffect(() => {
    const id = setTimeout(wander, WANDER_MS + Math.random() * 4000);
    return () => clearTimeout(id);
  }, [cat.x, cat.y, open, placing]);

  /** Case de la grille sous le doigt. */
  function cellAt(e: { clientX: number; clientY: number }): Cell {
    const r = world.current!.getBoundingClientRect();
    return {
      x: Math.min(GRID_W - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * GRID_W))),
      y: Math.min(H - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * H))),
    };
  }

  function tapGround(e: React.MouseEvent) {
    if (owner || placing) return;
    setOpen(null);
    const c = cellAt(e);
    // Quelques caresses rapides sur le chat : un petit secret.
    if (Math.abs(c.x - cat.x) <= 1 && Math.abs(c.y - cat.y) <= 1) {
      const t = catTaps.current, at = e.timeStamp;
      t.n = at - t.at < 1500 ? t.n + 1 : 1;
      t.at = at;
      if (t.n === 7) void foundSecret(roomId, "chat").then((m) => m && setNotice(m));
    }
    walkTo([c]);
  }

  // ---------- Glisser-déposer : appui long sur un objet pour le déplacer ; un nouvel objet se fait glisser ----------
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number; fired: boolean } | null>(null);
  const ghostRef = useRef<Cell | null>(null);
  const clampTo = (kind: string, c: Cell): Cell => {
    const [w, h] = sizeOf(kind);
    return { x: Math.min(Math.max(0, c.x), GRID_W - w), y: Math.min(Math.max(0, c.y), H - h) };
  };
  const coversCat = (kind: string, g: Cell) => footprint(kind, g.x, g.y).some((c) => c.x === cat.x && c.y === cat.y);

  /** Suit le doigt jusqu'au lâcher ; `offset` = où on a attrapé l'objet. */
  function follow(kind: string, offset: Cell, onDrop: (g: Cell) => void) {
    const onMove = (e: PointerEvent) => {
      const c = cellAt(e);
      const g = clampTo(kind, { x: c.x - offset.x, y: c.y - offset.y });
      ghostRef.current = g;
      setGhost(g);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setTimeout(() => (press.current = null), 0); // le clic qui suit le lâcher est ignoré
      onDrop(ghostRef.current!);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function startMove(t: Tile, grab: Cell) {
    navigator.vibrate?.(12);
    setOpen(null);
    setMsg("");
    setPlacing({ kind: t.kind as BuildingId, moving: t });
    ghostRef.current = { x: t.x, y: t.y };
    setGhost(ghostRef.current);
    follow(t.kind, { x: grab.x - t.x, y: grab.y - t.y }, (g) => {
      setPlacing(null);
      setGhost(null);
      if (g.x === t.x && g.y === t.y) return;
      const err = placeError(farm.tiles, farm.items, t.kind as BuildingId, g.x, g.y, farm.unlocks, t) ?? (coversCat(t.kind, g) ? "Ton chat est dans le passage." : null);
      if (err) return setMsg(err);
      act({ kind: "move", x: t.x, y: t.y, to: g }, false);
    });
  }

  const pressHandlers = (t: Tile) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (owner || placing) return;
      const grab = cellAt(e);
      press.current = { x: e.clientX, y: e.clientY, fired: false, timer: setTimeout(() => { press.current!.fired = true; startMove(t, grab); }, 380) };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const p = press.current;
      if (p && !p.fired && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) { clearTimeout(p.timer); press.current = null; }
    },
    onPointerUp: () => { if (press.current && !press.current.fired) clearTimeout(press.current.timer); },
    onPointerCancel: () => { if (press.current && !press.current.fired) { clearTimeout(press.current.timer); press.current = null; } },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  /** Nouvel objet : on le fait glisser là où on veut, puis « Poser ». */
  function dragNew(e: React.PointerEvent) {
    if (!placing || placing.moving) return;
    const g = clampTo(placing.kind, cellAt(e));
    ghostRef.current = g;
    setGhost(g);
    follow(placing.kind, { x: 0, y: 0 }, () => {});
  }
  function pickNew(kind: BuildingId) {
    setOpen(null);
    setMsg("");
    setPlacing({ kind });
    // première place libre, pour n'avoir qu'à la faire glisser
    const free = Array.from({ length: GRID_W * H }, (_, i) => ({ x: i % GRID_W, y: Math.floor(i / GRID_W) }))
      .find((c) => !placeError(farm.tiles, { coins: Infinity }, kind, c.x, c.y, farm.unlocks) && !coversCat(kind, c));
    setGhost(free ?? null);
  }

  function tapObject(t: Tile) {
    if (owner || placing || press.current?.fired) return;
    const use = () => (isReady(t, Date.now()) ? act({ kind: "collect", x: t.x, y: t.y }) : setOpen(t));
    walkTo(around(t, H), use); // le chat va à côté de l'objet, puis l'utilise
  }

  // Placement d'un objet (nouveau ou déplacé).
  const placeErr = placing && ghost
    ? placeError(farm.tiles, farm.items, placing.kind, ghost.x, ghost.y, farm.unlocks, placing.moving) ??
      (coversCat(placing.kind, ghost) ? "Ton chat est dans le passage." : null)
    : null;
  function confirmPlace() {
    if (!placing || !ghost || placeErr) return;
    const move: FarmMove = placing.moving
      ? { kind: "move", x: placing.moving.x, y: placing.moving.y, to: ghost }
      : { kind: "build", x: ghost.x, y: ghost.y, building: placing.kind };
    act(move);
    setPlacing(null);
    setGhost(null);
  }

  const box = (x: number, y: number, w: number, h: number) => ({
    left: `${(x / GRID_W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(w / GRID_W) * 100}%`, height: `${(h / H) * 100}%`,
  });
  const coins = farm.items.coins ?? 0;
  const sheet = open === "build" ? "build" : open ? tileAt(farm.tiles, open.x, open.y) : null; // version à jour

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{owner ? "En visite" : "Ta serre"}</p>
          <h2 className="text-2xl font-bold tracking-tight">{owner ? `Serre de ${owner}` : "Ma serre"}</h2>
        </div>
        <div className="flex items-center gap-2">
          {!owner && !placing && (
            <button onClick={() => { setOpen("build"); setMsg(""); }} className="btn-soft bg-white shadow-sm">Construire</button>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold tabular-nums shadow-sm">
            <ItemIcon id="coins" size={18} /> {coins}
          </span>
        </div>
      </header>

      {/* La serre : verrière au fond, sol carrelé (une tomette par case), objets à leur taille, le chat. */}
      <div className="overflow-hidden rounded-[1.6rem] bg-[#f8f6f1] p-1.5 shadow-[0_18px_40px_-24px_rgb(0_0_0/0.35)]">
      <div className="overflow-hidden rounded-t-[1.2rem]"><GreenhouseWall w={GRID_W} /></div>
      <div
        ref={world}
        onClick={tapGround}
        onPointerDown={dragNew}
        data-no-swipe
        className="relative isolate w-full touch-manipulation select-none"
        style={{ aspectRatio: `${GRID_W} / ${H}`, touchAction: placing ? "none" : undefined }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-b-[1.2rem]"><GreenhouseFloor w={GRID_W} h={H} /></div>
        {/* en mode placement, les joints sont soulignés pour viser plus facilement */}
        {placing && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(120,80,40,.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,80,40,.35) 1px, transparent 1px)",
              backgroundSize: `${100 / GRID_W}% ${100 / H}%`,
            }}
          />
        )}
        {farm.tiles.map((t) => {
          const [w, h] = sizeOf(t.kind);
          const r = recipeOf(t.kind, t.item);
          const done = isReady(t, now);
          const moving = placing?.moving && placing.moving.x === t.x && placing.moving.y === t.y;
          const selected = open && open !== "build" && open.x === t.x && open.y === t.y;
          return (
            <button
              key={`${t.x}-${t.y}`}
              onClick={(e) => { e.stopPropagation(); tapObject(t); }}
              {...pressHandlers(t)}
              aria-label={`${BUILDINGS[t.kind as BuildingId]?.name ?? t.kind}${r ? `, ${ITEMS[r.out].name}${done ? " prêt" : " en cours"}` : ""}`}
              className={`absolute p-[2px] transition-opacity ${placing ? "pointer-events-none" : ""} ${moving ? "opacity-30" : ""} ${selected ? "rounded-xl ring-2 ring-indigo-500" : ""}`}
              style={{ ...box(t.x, t.y, w, h), zIndex: (t.y + h) * 2, touchAction: "none" }}
            >
              <ObjectArt kind={t.kind} item={r ? r.out : null} growth={done ? 1 : progress(t, now)} />
              {r && !done && (
                <span className="absolute inset-x-[18%] bottom-[6%] h-1 overflow-hidden rounded-full bg-black/20">
                  <span className="block h-full rounded-full bg-white" style={{ width: `${progress(t, now) * 100}%` }} />
                </span>
              )}
            </button>
          );
        })}

        {/* Cadeaux reçus, en bas à droite de sa serre : un toucher les ouvre. */}
        {!owner && !placing && farm.gifts.map((g, i) => (
          <button
            key={g.id}
            aria-label={`Cadeau de ${names[g.giver] ?? "?"}`}
            onClick={(e) => {
              e.stopPropagation();
              setGiftFocus(g.id);
              setGiftShown(true);
            }}
            className="absolute animate-bounce p-[3px]"
            style={{ ...box(GRID_W - 1 - (i % GRID_W), H - 1 - Math.floor(i / GRID_W), 1, 1), zIndex: 900 }}
          >
            <GiftArt />
          </button>
        ))}

        {/* Bulles « prêt » : sur leur propre couche, jamais cachées par un objet voisin ou la verrière. */}
        {!placing && farm.tiles.map((t) => {
          const r = recipeOf(t.kind, t.item);
          if (!r || !isReady(t, now)) return null;
          const [w] = sizeOf(t.kind);
          return (
            <span
              key={`ready-${t.x}-${t.y}`}
              className="pointer-events-none absolute flex size-7 -translate-x-1/2 -translate-y-1/2 animate-bounce items-center justify-center rounded-full bg-white shadow-md"
              style={{ left: `${((t.x + w / 2) / GRID_W) * 100}%`, top: `${(t.y / H) * 100}%`, zIndex: 900 }}
            >
              <ItemIcon id={r.out} size={18} />
            </span>
          );
        })}

        {/* Fantôme de l'objet qu'on place. */}
        {placing && ghost && (
          <div
            className={`pointer-events-none absolute rounded-lg p-[2px] opacity-80 ring-2 ${placeErr ? "bg-red-400/30 ring-red-500" : "bg-white/40 ring-green-600"}`}
            style={{ ...box(ghost.x, ghost.y, ...BUILDINGS[placing.kind].size), zIndex: 999 }}
          >
            <ObjectArt kind={placing.kind} item={null} growth={0} />
          </div>
        )}

        {/* Valider / annuler la pose, collé à l'objet (au-dessus, ou en dessous en haut de la serre). */}
        {placing && !placing.moving && ghost && (() => {
          const [w, h] = BUILDINGS[placing.kind].size;
          const below = ghost.y < 2;
          return (
            <div
              className="absolute flex flex-col items-center gap-1"
              style={{
                left: `clamp(4.5rem, ${((ghost.x + w / 2) / GRID_W) * 100}%, calc(100% - 4.5rem))`,
                top: `${((below ? ghost.y + h : ghost.y) / H) * 100}%`,
                transform: `translate(-50%, ${below ? "0.4rem" : "calc(-100% - 0.4rem)"})`,
                zIndex: 1000,
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-lg">
                <button aria-label="Annuler" onClick={() => { setPlacing(null); setGhost(null); }} className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold text-zinc-500">
                  ✕
                </button>
                <button disabled={!!placeErr || pending} onClick={confirmPlace} className="btn h-9 gap-1 px-3 py-0 text-sm">
                  ✓ {BUILDINGS[placing.kind].cost} <ItemIcon id="coins" size={14} />
                </button>
              </div>
              {placeErr && <span className="max-w-44 rounded-lg bg-white/95 px-2 py-0.5 text-center text-[11px] font-medium text-red-700 shadow">{placeErr}</span>}
            </div>
          );
        })()}

        {/* Le chat : marche sur sa case, glisse d'une case à l'autre. */}
        <div
          className="pointer-events-none absolute transition-[left,top] ease-linear"
          style={{
            left: `${((cat.x + 0.5) / GRID_W) * 100}%`,
            top: `${((cat.y + 1) / H) * 100}%`,
            width: `${(1.6 / GRID_W) * 100}%`,
            transform: `translate(-50%, -92%) scaleX(${facing})`,
            transitionDuration: `${STEP_MS}ms`,
            zIndex: (cat.y + 1) * 2 + 1,
          }}
        >
          <div className="[&>svg]:h-auto [&>svg]:w-full"><CharacterSprite character={character} walking={walking} /></div>
        </div>
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[1.2rem]"><GreenhouseLight /></div>
      </div>
      </div>

      {/* Ferme pleine (aucune place trouvée) : on peut quand même annuler. */}
      {placing && !placing.moving && !ghost && (
        <button onClick={() => setPlacing(null)} className="btn-soft w-full py-3">Annuler</button>
      )}
      {msg && !open && <p role="alert" className="text-center text-sm text-red-700">{msg}</p>}
      {notice && !open && <p role="status" className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800">{notice}</p>}

      {!owner && (
        <section>
          <h3 className="eyebrow mb-1">Réserve · vendre au marché du village</h3>
          {owned(farm.items).length === 0 && <p className="py-2 text-sm text-zinc-500">Ta réserve est vide : plante quelque chose !</p>}
          <div className="rows">
            {owned(farm.items).map(([k, qty]) => (
              <div key={k} className="flex items-center gap-3 py-2.5">
                <ItemIcon id={k} size={28} />
                <span className="flex-1">
                  <span className="block font-medium">{ITEMS[k].name} <span className="tabular-nums text-zinc-500">× {qty}</span></span>
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500">{sellPrice(k, farm.unlocks)} <ItemIcon id="coins" size={12} /> l&apos;unité</span>
                </span>
                <button disabled={pending} onClick={() => act({ kind: "sell", item: k, qty: 1 }, false)} className="btn-soft px-3 py-1.5 text-xs">Vendre 1</button>
                <button disabled={pending} onClick={() => act({ kind: "sell", item: k, qty }, false)} className="btn-soft px-3 py-1.5 text-xs">Tout</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!owner && farm.collection.length > 0 && (
        <section>
          <h3 className="eyebrow mb-1">Collection de fleurs · {farm.collection.length}</h3>
          <div className="rows">
            {farm.collection.map((g) => (
              <div key={g.id} className="flex items-start gap-3 py-2.5">
                <ItemIcon id="flower" size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm italic text-zinc-700">« {g.message ?? "Une fleur pour toi."} »</span>
                  <span className="text-xs text-zinc-500">
                    {names[g.giver] ?? "?"} · {new Date(`${g.day}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!owner && (revealed || (giftShown && waiting)) && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/35" />
          <div className="animate-pop relative w-full max-w-xs rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
            {revealed ? (
              <>
                <div className="animate-pop mx-auto size-24"><ItemIcon id="flower" size={96} /></div>
                <p className="mt-3 text-lg font-semibold italic leading-snug">« {revealed.message ?? "Une fleur pour toi."} »</p>
                <p className="mt-2 text-sm text-zinc-500">— {names[revealed.giver] ?? "Quelqu'un"}</p>
                <p className="mt-4 text-xs text-zinc-400">Ajoutée à ta collection de fleurs.</p>
                <button onClick={() => { setRevealed(null); setGiftFocus(null); }} className="btn mt-4 w-full">Merci !</button>
              </>
            ) : (
              waiting && (
                <>
                  <div className="mx-auto size-24 animate-bounce"><GiftArt /></div>
                  <p className="mt-3 text-lg font-semibold">{names[waiting.giver] ?? "Quelqu'un"} t&apos;a laissé un cadeau</p>
                  <button
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                      const res = await openGift(roomId, waiting.id);
                      setFarm(res.farm);
                      setRevealed(res.gift ?? { ...waiting });
                    })}
                    className="btn mt-4 w-full"
                  >
                    Ouvrir
                  </button>
                  <button onClick={() => setGiftShown(false)} className="mt-2 text-sm text-zinc-500">Plus tard</button>
                </>
              )
            )}
          </div>
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-[1000] flex items-end" role="dialog" aria-modal>
          <button aria-label="Fermer" onClick={() => setOpen(null)} className="absolute inset-0 bg-black/25" />
          <div className="animate-pop relative mx-auto max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
            {sheet === "build" ? (
              <BuildList farm={farm} pending={pending} pick={pickNew} />
            ) : (
              <TileSheet
                tile={sheet}
                farm={farm}
                now={now}
                pending={pending}
                act={act}
              />
            )}
            {msg && <p role="alert" className="mt-3 text-center text-sm text-red-700">{msg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Catalogue des objets à poser. */
function BuildList({ farm, pending, pick }: { farm: Farm; pending: boolean; pick: (k: BuildingId) => void }) {
  return (
    <>
      <h3 className="text-lg font-bold">Construire</h3>
      <div className="rows mt-2">
        {(Object.entries(BUILDINGS) as [BuildingId, (typeof BUILDINGS)[BuildingId]][]).map(([id, b]) => {
          // Erreurs indépendantes de l'emplacement (verrou, limite, pièces) : on teste sur une ferme sans les autres objets.
          const err = placeError(farm.tiles.filter((t) => t.kind === id), farm.items, id, 0, 0, farm.unlocks);
          const blocking = err && err !== "Il y a déjà quelque chose ici." ? err : null;
          return (
            <div key={id} className={`flex items-center gap-3 py-2.5 ${blocking === "À débloquer avec un projet de la salle." ? "opacity-50" : ""}`}>
              <span className="flex size-12 items-center justify-center rounded-xl bg-[#efd9ba] p-1">
                <span className="block" style={{ width: `${(b.size[0] / 2) * 100}%`, aspectRatio: `${b.size[0]} / ${b.size[1]}` }}>
                  <ObjectArt kind={id} item={null} growth={0} />
                </span>
              </span>
              <span className="flex-1">
                <span className="block font-medium">{b.name} <span className="text-xs font-normal text-zinc-500">{b.size[0]}×{b.size[1]}</span></span>
                <span className="text-xs text-zinc-500">
                  {blocking ?? (b.recipes.length ? b.recipes.map((r) => ITEMS[r.out].name).join(", ") : "Décoration")}
                </span>
              </span>
              <button disabled={pending || !!blocking} onClick={() => pick(id)} className="btn px-4 py-2 text-sm">
                {b.cost} <ItemIcon id="coins" size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Actions sur un objet : lancer une recette, suivre la progression, démolir (on le déplace par appui long). */
function TileSheet({ tile, farm, now, pending, act }: {
  tile: Tile;
  farm: Farm;
  now: number;
  pending: boolean;
  act: (m: FarmMove, close?: boolean) => void;
}) {
  const b = BUILDINGS[tile.kind as BuildingId];
  const r = recipeOf(tile.kind, tile.item);
  const head = (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h3 className="text-lg font-bold">{b?.name ?? tile.kind}</h3>
      {!tile.item && (
        <button disabled={pending} onClick={() => confirm("Démolir cet objet ? Il ne sera pas remboursé.") && act({ kind: "clear", x: tile.x, y: tile.y })} className="text-sm text-zinc-400 hover:text-red-600">
          Démolir
        </button>
      )}
    </div>
  );

  if (r && isItem(r.out)) {
    const left = Date.parse(tile.ready_at!) - now;
    return (
      <>
        {head}
        <div className="flex items-center gap-4">
          <ItemIcon id={r.out} size={44} />
          <div className="flex-1">
            <p className="font-medium">{ITEMS[r.out].name} × {r.qty}</p>
            <p className="text-sm text-zinc-500">{left > 0 ? `Prêt dans ${fmt(left)}` : "Prêt !"}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${progress(tile, now) * 100}%` }} />
            </div>
          </div>
          {left <= 0 && <button disabled={pending} onClick={() => act({ kind: "collect", x: tile.x, y: tile.y })} className="btn">Récolter</button>}
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      <div className="rows">
        {b?.recipes.map((rec) => (
          <div key={rec.id} className="flex items-center gap-3 py-2.5">
            <ItemIcon id={rec.out} size={32} />
            <span className="flex-1">
              <span className="block font-medium">{ITEMS[rec.out].name} × {rec.qty} <span className="text-xs font-normal text-zinc-500">· {fmt(duration(rec, farm.unlocks))}</span></span>
              <Cost need={rec.inputs} have={farm.items} />
            </span>
            <button disabled={pending || !has(farm.items, rec.inputs)} onClick={() => act({ kind: "start", x: tile.x, y: tile.y, recipe: rec.id })} className="btn px-4 py-2 text-sm">
              {b.verb}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
