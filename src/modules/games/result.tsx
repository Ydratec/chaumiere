// Récapitulatif visuel d'une partie terminée : les deux joueurs face à face, le gagnant couronné.
import { Avatar } from "@/src/components/avatar";
import type { Person } from "@/src/modules/rooms/context";
import type { Game } from "./actions";
import { GAME_TYPES, isGameType } from "./labels";

/** Score de chaque joueur, selon le jeu (pour Orapa : moins d'ondes = mieux). */
export function scoreOf(g: Game, uid: string): { value: number; unit: string } | null {
  const s = g.state as Record<string, unknown> | null;
  if (!s) return null;
  if (g.type === "memory") return { value: (s.scores as Record<string, number>)?.[uid] ?? 0, unit: "paires" };
  if (g.type === "battleship") return { value: (s.sunk as Record<string, unknown[]>)?.[uid]?.length ?? 0, unit: "coulés" };
  if (g.type === "orapa") return { value: ((s.log as { by: string; from?: string }[]) ?? []).filter((e) => e.by === uid && e.from).length, unit: "ondes" };
  return null;
}

const Crown = () => (
  <svg viewBox="0 0 24 16" className="absolute -top-3 left-1/2 w-7 -translate-x-1/2 drop-shadow" aria-label="Gagnant">
    <path d="M2 14V4l5 4 5-7 5 7 5-4v10z" fill="#f5c542" stroke="#d9a520" strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="12" cy="9.5" r="1.6" fill="#e5484d" />
  </svg>
);

export function GameResult({ game, people, me, big = false }: { game: Game; people: Record<string, Person>; me: string; big?: boolean }) {
  const s = game.state;
  if (!s) return null;
  const players = [game.creator, game.opponent!];
  const draw = s.winner === "draw";
  const forfeit = typeof s.forfeit === "string" ? s.forfeit : null;
  const label = isGameType(game.type) ? GAME_TYPES[game.type].label : game.type;
  const name = (id: string) => (id === me ? "Toi" : (people[id]?.name ?? "?"));
  const headline = draw ? "Égalité" : s.winner === me ? "Victoire !" : players.includes(me) ? "Défaite" : `${name(s.winner!)} gagne`;
  const size = big ? 72 : 44;

  const player = (id: string) => {
    const won = s.winner === id;
    const score = scoreOf(game, id);
    return (
      <div className={`flex flex-col items-center gap-1.5 ${!draw && !won ? "opacity-45" : ""}`}>
        <span className="relative">
          {won && <Crown />}
          <span className={`block rounded-full ${won ? "ring-2 ring-amber-400 ring-offset-2" : ""}`}>
            <Avatar url={people[id]?.url} character={people[id]?.character} name={people[id]?.name ?? "?"} size={size} />
          </span>
        </span>
        <span className={`max-w-full truncate text-sm ${won ? "font-bold" : "font-medium"}`}>{name(id)}</span>
        {score && (
          <span className="leading-none">
            <span className={`${big ? "text-3xl" : "text-xl"} font-bold tabular-nums`}>{score.value}</span>
            <span className="ml-1 text-xs text-zinc-500">{score.unit}</span>
          </span>
        )}
        {forfeit === id && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">abandon</span>}
      </div>
    );
  };

  return (
    <div className={big ? "panel text-center" : "rounded-2xl bg-white p-4 shadow-sm"}>
      <p className="eyebrow">{label}</p>
      {big && <p className={`mt-1 text-3xl font-bold tracking-tight ${s.winner === me ? "text-indigo-600" : ""}`}>{headline}</p>}
      <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 ${big ? "mt-6" : "mt-4"}`}>
        {player(players[0])}
        <span className="text-sm font-bold text-zinc-300">VS</span>
        {player(players[1])}
      </div>
    </div>
  );
}
