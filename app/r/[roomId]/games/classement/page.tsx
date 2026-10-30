import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/src/components/avatar";
import { Icon } from "@/src/components/icons";
import { adminDb } from "@/src/lib/db/server";
import { GAME_TYPES } from "@/src/modules/games/labels";
import { dailyStandings, standings, type DailyRow, type Played } from "@/src/modules/games/standings";
import { getRoomContext } from "@/src/modules/rooms/context";

const MEDAL = ["🥇", "🥈", "🥉"];

/** Classement de la salle, jeu par jeu (et pour le défi du jour). */
export default async function StandingsPage({ params, searchParams }: { params: Promise<{ roomId: string }>; searchParams: Promise<{ jeu?: string }> }) {
  const [{ roomId }, { jeu }] = await Promise.all([params, searchParams]);
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const [{ data: games }, { data: daily }] = await Promise.all([
    ctx.sb.from("games").select("type, creator, opponent, state->winner").eq("room_id", roomId).eq("status", "finished"),
    adminDb().from("daily_challenges").select("user_id, day, score, solved_at").eq("room_id", roomId), // tous les défis : un seul jeu par jour
  ]);
  const played = ((games ?? []) as unknown as Played[]);
  const tabs = [...Object.entries(GAME_TYPES).map(([id, t]) => ({ id, label: t.label })), { id: "defi", label: "Défi du jour" }];
  const tab = tabs.find((t) => t.id === jeu) ?? tabs[0];
  const person = (id: string) => ctx.people[id];
  const who = (id: string) => (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <Avatar url={person(id)?.url} character={person(id)?.character} name={person(id)?.name ?? "?"} size={30} />
      <span className={`truncate ${id === ctx.user.id ? "font-bold" : "font-medium"}`}>{person(id)?.name ?? "Ancien membre"}</span>
    </span>
  );

  return (
    <div className="space-y-5" data-no-swipe>
      <Link href={`/r/${roomId}/games`} className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
        <Icon name="back" size={16} /> Jeux
      </Link>
      <h2 className="text-2xl font-bold tracking-tight">Classements</h2>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {tabs.map((t) => (
          <Link key={t.id} href={`/r/${roomId}/games/classement?jeu=${t.id}`} aria-current={t.id === tab.id ? "page" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${t.id === tab.id ? "bg-indigo-600 text-white" : "bg-white text-zinc-600 shadow-sm"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab.id === "defi" ? (() => {
        const rows = dailyStandings((daily ?? []) as DailyRow[]);
        if (!rows.length) return <p className="text-sm text-zinc-500">Personne n&apos;a encore réussi de défi du jour.</p>;
        return (
          <section className="rounded-[1.5rem] bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs text-zinc-500">Jours remportés (meilleur score du jour) · défis réussis</p>
            <ol className="rows">
              {rows.map((r, i) => (
                <li key={r.user} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-6 text-center">{MEDAL[i] ?? <span className="tabular-nums text-zinc-400">{i + 1}</span>}</span>
                  {who(r.user)}
                  <span className="text-right tabular-nums">
                    <b>{r.days}</b> <span className="text-zinc-500">j.</span> · {r.solved}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })() : (() => {
        const rows = standings(played, tab.id);
        if (!rows.length) return <p className="text-sm text-zinc-500">Aucune partie de {tab.label} terminée pour l&apos;instant.</p>;
        return (
          <section className="rounded-[1.5rem] bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs text-zinc-500">3 points la victoire, 1 l&apos;égalité · V / N / D · % de victoires</p>
            <ol className="rows">
              {rows.map((r, i) => (
                <li key={r.user} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-6 text-center">{MEDAL[i] ?? <span className="tabular-nums text-zinc-400">{i + 1}</span>}</span>
                  {who(r.user)}
                  <span className="text-right tabular-nums">
                    <b>{r.points}</b> <span className="text-zinc-500">pts</span>
                    <span className="block text-xs text-zinc-500">{r.wins} / {r.draws} / {r.losses} · {Math.round(r.rate * 100)} %</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })()}
    </div>
  );
}
