import Link from "next/link";
import { redirect } from "next/navigation";
import { loadUnlocks } from "@/src/modules/farm/data";
import { GAME_LOCKS } from "@/src/modules/farm/projects";
import { Icon } from "@/src/components/icons";
import { GameIcon } from "@/src/modules/games/game-icon";
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

  const row = "ticket flex items-center justify-between gap-3 px-5 py-3 text-sm";
  const arrow = <span className="text-ink"><Icon name="arrow" size={18} /></span>;

  return (
    <>
      <GamesLive roomId={roomId} />
      <div className="relative pl-7">
        <Link href={`/r/${roomId}/games/defi`} className="sticker band-lilac flex min-h-[5.6rem] items-center gap-3 py-3.5 pb-5 pl-14 pr-3.5">
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[1.35rem] font-extrabold leading-tight">{CHALLENGES[kind].name}</span>
            <span className="mt-0.5 block text-[13px] font-bold">
              {myDaily?.solved_at ? `Trouvé en ${CHALLENGES[kind].unit(myDaily.score ?? 0)}` : myDaily ? "En cours" : "Jusqu'à 200 pièces"}
              {", "}
              {solvers ? `${solvers} ${solvers > 1 ? "ont" : "a"} trouvé` : "personne n'a encore trouvé"}
            </span>
          </span>
          <span className="rounded-full bg-ink px-3.5 py-1.5 font-display font-bold text-white">{myDaily?.solved_at ? "Voir" : "Jouer"}</span>
        </Link>
        <span aria-hidden className="cut absolute -left-1 top-1.5 size-[4.5rem] -rotate-12">
          <svg width="72" height="72" viewBox="0 0 72 72" className="absolute inset-0"><path d="M70 36L65.4 41.9L67.4 49L60.9 52.7L60 60L52.7 60.9L49 67.4L41.9 65.4L36 70L30.1 65.4L23 67.4L19.3 60.9L12 60L11.1 52.7L4.6 49L6.6 41.9L2 36L6.6 30.1L4.6 23L11.1 19.3L12 12L19.3 11.1L23 4.6L30.1 6.6L36 2L41.9 6.6L49 4.6L52.7 11.1L60 12L60.9 19.3L67.4 23L65.4 30.1Z" fill="#FFD54A" stroke="#2B2730" strokeWidth="2.2" strokeLinejoin="round" /></svg>
          <span className="absolute inset-0 flex items-center justify-center text-center font-display text-xs font-extrabold leading-none">Défi<br />du jour</span>
        </span>
      </div>
      <form action={createGame} className="space-y-4">
        <input type="hidden" name="room_id" value={roomId} />
        <h2 className="tape tape-sky">Lancer un défi</h2>
        <div className="grid grid-cols-4 gap-2.5">
          {Object.entries(GAME_TYPES).map(([type, t], k) => locked(type) ? (
            <Link
              key={type}
              href={`/r/${roomId}/farm`}
              className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-ink/40 px-1 py-2.5 text-center text-zinc-500"
            >
              <span className="opacity-40 grayscale"><GameIcon type={type} /></span>
              <span className="font-display text-[13px] font-bold leading-none">{t.label}</span>
              <span className="text-[10px] font-bold leading-tight">À débloquer</span>
            </Link>
          ) : (
            <label
              key={type}
              className="sticker relative flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 text-center has-[:checked]:bg-indigo-300 [&:has(:checked)_.tick]:flex"
            >
              <input type="radio" name="type" value={type} defaultChecked={k === 0} className="sr-only" />
              <GameIcon type={type} />
              <span className="font-display text-[13px] font-bold leading-none">{t.label}</span>
              <span aria-hidden className="tick absolute -right-2.5 -top-3 hidden size-6 items-center justify-center rounded-full bg-ink">
                <svg viewBox="0 0 24 24" width="13" height="13"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </label>
          ))}
        </div>
        <select name="target" className="field font-semibold">
          <option value="">Contre toute la salle (le premier qui accepte)</option>
          {ctx.members.filter((m) => m.user_id !== me).map((m) => (
            <option key={m.user_id} value={m.user_id}>Contre {m.username}</option>
          ))}
        </select>
        <button className="btn w-full">Lancer le défi</button>
      </form>

      <ScratchShop roomId={roomId} coins={wallet?.qty ?? 0} pending={pending} />

      {received.length > 0 && (
        <section>
          <h2 className="tape tape-leaf mb-3">On t&apos;attend</h2>
          <div className="space-y-3">
            {received.map((g) => (
              <div key={g.id} className={row}>
                <span>{name(g.creator)} {g.target ? "te défie" : "défie la salle"} · <b>{label(g)}</b></span>
                <form action={acceptGame}>
                  <input type="hidden" name="game_id" value={g.id} />
                  <button className="rounded-full border-2 border-ink bg-[#FFD54A] px-3.5 py-1 font-display font-bold">Accepter</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {playing.length > 0 && (
        <section>
          <h2 className="tape tape-pink mb-3">Parties en cours</h2>
          <div className="space-y-3">
            {playing.map((g) => (
              <Link key={g.id} href={href(g)} className={row}>
                <span>{label(g)} contre {name(g.creator === me ? g.opponent! : g.creator)}</span>
                <span className="flex items-center gap-2">
                  {g.state?.turn === me && <span className="rounded-full bg-ink px-2.5 py-0.5 font-display text-sm font-bold text-white">À toi</span>}
                  {arrow}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {sent.length > 0 && (
        <section>
          <h2 className="tape mb-3">Mes défis en attente</h2>
          <div className="space-y-3">
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
        <Link href={`/r/${roomId}/games/classement`} className="flex items-center justify-center gap-2 sticker px-3 py-3 font-display font-bold">
          <Icon name="trophy" size={20} /> Classements
        </Link>
        <Link href={`/r/${roomId}/games/historique`} className="flex items-center justify-center gap-2 sticker px-3 py-3 font-display font-bold">
          <Icon name="scroll" size={20} /> Historique
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
          <Link href={`/r/${roomId}/games/historique`} className="mt-3 block text-center font-display font-bold">Toutes les parties de la salle</Link>
        </section>
      )}
    </>
  );
}
