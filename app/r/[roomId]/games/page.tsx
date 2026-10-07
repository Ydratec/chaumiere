import Link from "next/link";
import { redirect } from "next/navigation";
import { Cat } from "@/src/components/cat";
import { loadUnlocks } from "@/src/modules/farm/data";
import { GAME_LOCKS } from "@/src/modules/farm/projects";
import { Icon } from "@/src/components/icons";
import { acceptGame, createGame, type Game } from "@/src/modules/games/actions";
import { GAME_TYPES, isGameType } from "@/src/modules/games/labels";
import { GamesLive } from "@/src/modules/games/live";
import { GameResult } from "@/src/modules/games/result";
import { getRoomContext } from "@/src/modules/rooms/context";


export default async function GamesPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const me = ctx.user.id;
  const { data } = await ctx.sb
    .from("games").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(30).returns<Game[]>();
  const games = data ?? [];
  const unlocks = await loadUnlocks(roomId);
  const locked = (type: string) => !!GAME_LOCKS[type] && !unlocks.includes(GAME_LOCKS[type]);
  const name = (id: string) => (id === me ? "toi" : (ctx.names[id] ?? "?"));
  const href = (g: Game) => `/r/${roomId}/games/${g.id}`;
  const label = (g: Game) => (isGameType(g.type) ? GAME_TYPES[g.type].label : g.type);

  const received = games.filter((g) => g.status === "open" && g.creator !== me && (!g.target || g.target === me));
  const sent = games.filter((g) => g.status === "open" && g.creator === me);
  const playing = games.filter((g) => g.status === "playing" && (g.creator === me || g.opponent === me));
  const finished = games.filter((g) => g.status === "finished").slice(0, 5);

  const row = "flex items-center justify-between gap-3 py-3 text-sm";
  const arrow = <span className="text-zinc-400"><Icon name="arrow" size={16} /></span>;

  return (
    <>
      <GamesLive roomId={roomId} />
      <form action={createGame} className="space-y-4">
        <input type="hidden" name="room_id" value={roomId} />
        <h2 className="text-2xl font-bold tracking-tight">Lancer un défi</h2>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(GAME_TYPES).map(([type, t], k) => locked(type) ? (
            <Link
              key={type}
              href={`/r/${roomId}/farm`}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white/50 p-3 text-center text-zinc-400"
            >
              <span className="opacity-40 grayscale"><Cat coat={[0, 6, 1][k]} size={40} /></span>
              <span className="text-sm font-semibold leading-tight">{t.label}</span>
              <span className="text-[10px] font-medium">Débloque-le à la serre</span>
            </Link>
          ) : (
            <label
              key={type}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-transparent transition has-[:checked]:bg-indigo-50 has-[:checked]:ring-indigo-500"
            >
              <input type="radio" name="type" value={type} defaultChecked={k === 0} className="sr-only" />
              <Cat coat={[0, 6, 1][k]} mood={(["happy", "cool", "wow"] as const)[k]} size={40} />
              <span className="text-sm font-semibold leading-tight">{t.label}</span>
            </label>
          ))}
        </div>
        <select name="target" className="field">
          <option value="">Toute la salle (le premier qui accepte)</option>
          {ctx.members.filter((m) => m.user_id !== me).map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.username}</option>
          ))}
        </select>
        <button className="btn w-full">Lancer le défi</button>
      </form>

      {received.length > 0 && (
        <section>
          <h2 className="eyebrow">Défis reçus</h2>
          <div className="rows">
            {received.map((g) => (
              <div key={g.id} className={row}>
                <span>{name(g.creator)} {g.target ? "te défie" : "défie la salle"} · <b>{label(g)}</b></span>
                <form action={acceptGame}>
                  <input type="hidden" name="game_id" value={g.id} />
                  <button className="btn px-4 py-1.5 text-sm">Jouer</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {playing.length > 0 && (
        <section>
          <h2 className="eyebrow">Parties en cours</h2>
          <div className="rows">
            {playing.map((g) => (
              <Link key={g.id} href={href(g)} className={row}>
                <span>{label(g)} contre {name(g.creator === me ? g.opponent! : g.creator)}</span>
                <span className="flex items-center gap-2">
                  {g.state?.turn === me && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">À toi</span>}
                  {arrow}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {sent.length > 0 && (
        <section>
          <h2 className="eyebrow">Mes défis en attente</h2>
          <div className="rows">
            {sent.map((g) => (
              <Link key={g.id} href={href(g)} className={row}>
                <span>{label(g)} · {g.target ? `défi à ${name(g.target)}` : "défi à toute la salle"}</span>
                {arrow}
              </Link>
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Dernières parties</h2>
          <div className="space-y-3">
            {finished.map((g) => (
              <Link key={g.id} href={href(g)} className="block transition active:scale-[0.99]">
                <GameResult game={g} people={ctx.people} me={me} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
