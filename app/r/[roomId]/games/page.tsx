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
import { adminDb } from "@/src/lib/db/server";
import { getRoomContext } from "@/src/modules/rooms/context";
import { loadPending } from "@/src/modules/scratch/data";
import { ScratchShop } from "@/src/modules/scratch/shop";
import { challengeDay, kindFor } from "@/src/modules/challenges/data";
import { CHALLENGES } from "@/src/modules/challenges/rotation";


export default async function GamesPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const me = ctx.user.id;
  // Défis et parties en cours : tous (pas de limite, il y en a peu) ; parties finies : les 5 dernières où l'on a joué.
  const [{ data: active }, { data: mine }] = await Promise.all([
    ctx.sb.from("games").select("*").eq("room_id", roomId).in("status", ["open", "playing"]).order("created_at", { ascending: false }).returns<Game[]>(),
    ctx.sb.from("games").select("*").eq("room_id", roomId).eq("status", "finished").or(`creator.eq.${me},opponent.eq.${me}`)
      .order("created_at", { ascending: false }).limit(5).returns<Game[]>(),
  ]);
  const games = active ?? [];
  const { kind } = await kindFor(roomId);
  const [unlocks, pending, { data: wallet }, { data: daily }] = await Promise.all([
    loadUnlocks(roomId),
    loadPending(roomId, me),
    adminDb().from("farm_items").select("qty").eq("room_id", roomId).eq("user_id", me).eq("item", "coins").maybeSingle(),
    adminDb().from("daily_challenges").select("user_id, score, solved_at").eq("room_id", roomId).eq("day", challengeDay()).eq("kind", kind),
  ]);
  const myDaily = (daily ?? []).find((d) => d.user_id === me);
  const solvers = (daily ?? []).filter((d) => d.solved_at).length;
  const locked = (type: string) => !!GAME_LOCKS[type] && !unlocks.includes(GAME_LOCKS[type]);
  const name = (id: string) => (id === me ? "toi" : (ctx.names[id] ?? "?"));
  const href = (g: Game) => `/r/${roomId}/games/${g.id}`;
  const label = (g: Game) => (isGameType(g.type) ? GAME_TYPES[g.type].label : g.type);

  const received = games.filter((g) => g.status === "open" && g.creator !== me && (!g.target || g.target === me));
  const sent = games.filter((g) => g.status === "open" && g.creator === me);
  const playing = games.filter((g) => g.status === "playing" && (g.creator === me || g.opponent === me));
  const finished = mine ?? [];

  const row = "flex items-center justify-between gap-3 py-3 text-sm";
  const arrow = <span className="text-zinc-400"><Icon name="arrow" size={16} /></span>;

  return (
    <>
      <GamesLive roomId={roomId} />
      {(
        <Link href={`/r/${roomId}/games/defi`} className="flex items-center gap-4 rounded-[1.75rem] bg-slate-800 p-4 text-white shadow-sm">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-700 text-2xl" aria-hidden>{CHALLENGES[kind].icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wider text-white/60">Défi du jour</span>
            <span className="block font-bold">{CHALLENGES[kind].name}</span>
            <span className="block text-sm text-white/70">
              {myDaily?.solved_at ? `Trouvé en ${CHALLENGES[kind].unit(myDaily.score ?? 0)} · ` : myDaily ? "En cours · " : "Jusqu'à 200 pièces · "}
              {solvers ? `${solvers} ${solvers > 1 ? "ont" : "a"} trouvé` : "personne n'a encore trouvé"}
            </span>
          </span>
          {arrow}
        </Link>
      )}
      <form action={createGame} className="space-y-4">
        <input type="hidden" name="room_id" value={roomId} />
        <h2 className="text-2xl font-bold tracking-tight">Lancer un défi</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(GAME_TYPES).map(([type, t], k) => locked(type) ? (
            <Link
              key={type}
              href={`/r/${roomId}/farm`}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white/50 p-3 text-center text-zinc-400"
            >
              <span className="opacity-40 grayscale"><Cat coat={[0, 6, 1, 3][k] ?? 0} size={40} /></span>
              <span className="text-sm font-semibold leading-tight">{t.label}</span>
              <span className="text-[10px] font-medium">Débloque-le à la serre</span>
            </Link>
          ) : (
            <label
              key={type}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-transparent transition has-[:checked]:bg-indigo-50 has-[:checked]:ring-indigo-500"
            >
              <input type="radio" name="type" value={type} defaultChecked={k === 0} className="sr-only" />
              <Cat coat={[0, 6, 1, 3][k] ?? 0} mood={(["happy", "cool", "wow", "laugh"] as const)[k] ?? "happy"} size={40} />
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

      <ScratchShop roomId={roomId} coins={wallet?.qty ?? 0} pending={pending} />

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

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/r/${roomId}/games/classement`} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-semibold shadow-sm">
          <span aria-hidden>🏆</span> Classements
        </Link>
        <Link href={`/r/${roomId}/games/historique`} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-semibold shadow-sm">
          <span aria-hidden>📜</span> Historique
        </Link>
      </div>

      {finished.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Mes dernières parties</h2>
          <div className="space-y-3">
            {finished.map((g) => (
              <Link key={g.id} href={href(g)} className="block transition active:scale-[0.99]">
                <GameResult game={g} people={ctx.people} me={me} />
              </Link>
            ))}
          </div>
          <Link href={`/r/${roomId}/games/historique`} className="mt-3 block text-center text-sm font-semibold text-indigo-600">Toutes les parties de la salle ›</Link>
        </section>
      )}
    </>
  );
}
