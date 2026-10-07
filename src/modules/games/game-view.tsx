"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Cat } from "@/src/components/cat";
import { Icon } from "@/src/components/icons";
import { browserDb } from "@/src/lib/db/client";
import { acceptGame, cancelGame, forfeitGame, playMove, type Game } from "./actions";
import { BattleshipBoard } from "./battleship-board";
import { GAME_TYPES, isGameType, type BoardProps } from "./labels";
import { MemoryBoard } from "./memory-board";
import { OrapaBoard } from "./orapa-board";
import { GameResult } from "./result";
import type { Person } from "@/src/modules/rooms/context";

const BOARDS: Record<keyof typeof GAME_TYPES, (p: BoardProps) => React.ReactNode> = {
  memory: MemoryBoard,
  battleship: BattleshipBoard,
  orapa: OrapaBoard,
};

// Étape de la partie (statut + phase éventuelle) : quand elle change, on recharge la page serveur
// pour recevoir les données privées du joueur (sa flotte, sa grille…).
const stage = (g: Game) => `${g.status}/${g.state?.phase ?? ""}`;

/** Une partie, tous jeux confondus : attente, plateau, résultat. Se met à jour en temps réel. */
export function GameView({
  initial,
  userId,
  names,
  people,
  priv,
}: {
  initial: Game;
  userId: string;
  names: Record<string, string>;
  people: Record<string, Person>;
  priv: unknown;
}) {
  const [game, setGame] = useState(initial);
  const [sb] = useState(browserDb);
  const router = useRouter();
  const seen = useRef(stage(initial));

  useEffect(() => {
    const ch = sb
      .channel(`game-${initial.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${initial.id}` }, (p) => {
        const g = p.new as Game;
        if (stage(g) !== seen.current) {
          seen.current = stage(g);
          router.refresh();
        }
        setGame((cur) => (g.version >= cur.version ? g : cur));
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [sb, initial.id, router]);

  function apply(res: Pick<Game, "state" | "status" | "version"> | null) {
    if (res) setGame((g) => (res.version >= g.version ? { ...g, ...res } : g));
  }
  const play = async (move: unknown) => apply(await playMove(game.id, move));
  async function forfeit() {
    if (confirm("Abandonner la partie ? Ton adversaire gagnera.")) apply(await forfeitGame(game.id));
  }

  const type = isGameType(game.type) ? game.type : "memory";
  const label = GAME_TYPES[type].label;
  const name = (id: string) => (id === userId ? "toi" : (names[id] ?? "?"));
  const back = (
    <Link href={`/r/${game.room_id}/games`} className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
      <Icon name="back" size={16} /> Jeux
    </Link>
  );
  const hidden = <input type="hidden" name="game_id" value={game.id} />;

  if (game.status === "cancelled")
    return <div className="space-y-6">{back}<p className="text-zinc-600">Ce défi a été annulé.</p></div>;

  if (game.status === "open") {
    const mine = game.creator === userId;
    const canAccept = !mine && (!game.target || game.target === userId);
    return (
      <div className="space-y-6">
        {back}
        <section className="space-y-4 pt-6 text-center">
          <div className="flex justify-center -space-x-3"><Cat coat={0} size={72} /><Cat coat={2} mood="wow" size={72} /></div>
          <h2 className="text-3xl font-bold tracking-tight">{label}</h2>
          <p className="text-zinc-600">
            {mine
              ? game.target ? `En attente de ${name(game.target)}…` : "En attente d'un adversaire dans la salle…"
              : `${name(game.creator)} te défie${game.target ? "" : " (défi ouvert à toute la salle)"}.`}
          </p>
          {canAccept && (
            <form action={acceptGame}>{hidden}<button className="btn w-full">Relever le défi</button></form>
          )}
          {(mine || game.target === userId) && (
            <form action={cancelGame}>{hidden}<button className="btn-soft">{mine ? "Annuler le défi" : "Refuser"}</button></form>
          )}
        </section>
      </div>
    );
  }

  const s = game.state!;
  const players = [game.creator, game.opponent!];
  const spectator = !players.includes(userId);
  const myTurn = !spectator && s.turn === userId && !s.winner;
  const text = s.phase === "setup" ? "Chacun compose sa grille en secret…" : myTurn ? "À toi de jouer !" : `Au tour de ${name(s.turn)}…`;
  const Board = BOARDS[type];

  return (
    <div className="space-y-5" data-no-swipe>
      <div className="flex items-center justify-between">
        {back}
        {!spectator && !s.winner && (
          <button onClick={forfeit} className="text-sm font-medium text-zinc-400 hover:text-red-600">Abandonner</button>
        )}
      </div>
      {s.winner ? (
        <GameResult game={game} people={people} me={userId} big />
      ) : (
        <header>
          <p className="eyebrow">{label} · {name(players[0])} contre {name(players[1])}</p>
          <p className={`mt-1 text-2xl font-bold tracking-tight ${myTurn ? "text-indigo-600" : ""}`}>{text}</p>
        </header>
      )}
      <Board gameId={game.id} state={s} userId={userId} myTurn={myTurn} name={name} play={play} priv={priv} />
    </div>
  );
}
