import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/src/components/icons";
import type { Game } from "@/src/modules/games/actions";
import { GAME_TYPES, isGameType } from "@/src/modules/games/labels";
import { GameResult } from "@/src/modules/games/result";
import { getRoomContext } from "@/src/modules/rooms/context";

const PAGE = 20;

/** Toutes les parties terminées de la salle, filtrables par jeu et par joueur. */
export default async function HistoryPage({ params, searchParams }: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ jeu?: string; qui?: string; n?: string }>;
}) {
  const [{ roomId }, q] = await Promise.all([params, searchParams]);
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const me = ctx.user.id;
  const jeu = q.jeu && isGameType(q.jeu) ? q.jeu : null;
  const qui = q.qui === "moi" ? me : q.qui && ctx.names[q.qui] ? q.qui : null;
  const n = Math.min(200, Math.max(PAGE, Number(q.n) || PAGE));

  let query = ctx.sb.from("games").select("*").eq("room_id", roomId).eq("status", "finished");
  if (jeu) query = query.eq("type", jeu);
  if (qui) query = query.or(`creator.eq.${qui},opponent.eq.${qui}`);
  const { data } = await query.order("created_at", { ascending: false }).limit(n + 1).returns<Game[]>();
  const games = (data ?? []).slice(0, n);
  const more = (data ?? []).length > n;

  const url = (p: { jeu?: string | null; qui?: string | null; n?: number }) => {
    const s = new URLSearchParams();
    const j = p.jeu === undefined ? jeu : p.jeu, w = p.qui === undefined ? (q.qui === "moi" ? "moi" : qui) : p.qui;
    if (j) s.set("jeu", j);
    if (w) s.set("qui", w);
    if (p.n) s.set("n", String(p.n));
    return `/r/${roomId}/games/historique${s.size ? `?${s}` : ""}`;
  };
  const chip = (href: string, on: boolean, text: string) => (
    <Link key={href + text} href={href} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${on ? "bg-indigo-600 text-white" : "bg-white text-zinc-600 shadow-sm"}`}>{text}</Link>
  );

  return (
    <div className="space-y-5" data-no-swipe>
      <Link href={`/r/${roomId}/games`} className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
        <Icon name="back" size={16} /> Jeux
      </Link>
      <h2 className="text-2xl font-bold tracking-tight">Historique des parties</h2>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {chip(url({ jeu: null }), !jeu, "Tous les jeux")}
        {Object.entries(GAME_TYPES).map(([id, t]) => chip(url({ jeu: id }), jeu === id, t.label))}
      </nav>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {chip(url({ qui: null }), !qui, "Toute la salle")}
        {chip(url({ qui: "moi" }), qui === me, "Mes parties")}
        {ctx.members.filter((m) => m.user_id !== me).map((m) => chip(url({ qui: m.user_id }), qui === m.user_id, m.username))}
      </nav>

      {games.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucune partie terminée avec ces filtres.</p>
      ) : (
        <div className="space-y-3">
          {games.map((g) => (
            <Link key={g.id} href={`/r/${roomId}/games/${g.id}`} className="block transition active:scale-[0.99]">
              <GameResult game={g} people={ctx.people} me={me} />
              <p className="mt-1 px-2 text-right text-xs text-zinc-400">
                {new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date((g as Game & { created_at: string }).created_at))}
              </p>
            </Link>
          ))}
        </div>
      )}
      {more && <Link href={url({ n: n + PAGE })} className="btn-soft w-full">Voir plus</Link>}
    </div>
  );
}
