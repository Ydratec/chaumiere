import Link from "next/link";
import { Medal } from "@/src/components/medal";
import { redirect } from "next/navigation";
import { Avatar } from "@/src/components/avatar";
import { Icon } from "@/src/components/icons";
import { adminDb } from "@/src/lib/db/server";
import { GAME_TYPES } from "@/src/modules/games/labels";
import { dailyStandings, standings, type DailyRow, type Played } from "@/src/modules/games/standings";
import { getRoomContext } from "@/src/modules/rooms/context";
import { quizVisible } from "@/src/modules/quiz/access";
import { loadOnlineStats } from "@/src/modules/quiz/online-results";
import { QUIZ_GAMES, dailyFirst, dailyWins, parisDay, records, type ScoreRow } from "@/src/modules/quiz/scores";


/** Classement de la salle, jeu par jeu (et pour le défi du jour). */
export default async function StandingsPage({ params, searchParams }: { params: Promise<{ roomId: string }>; searchParams: Promise<{ jeu?: string }> }) {
  const [{ roomId }, { jeu }] = await Promise.all([params, searchParams]);
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const quiz = quizVisible(ctx.user);
  const [{ data: games }, { data: daily }, { data: usine }, { data: quizRows }] = await Promise.all([
    ctx.sb.from("games").select("type, creator, opponent, state->winner").eq("room_id", roomId).eq("status", "finished"),
    adminDb().from("daily_challenges").select("user_id, day, score, solved_at").eq("room_id", roomId), // tous les défis : un seul jeu par jour
    // Usine de Noël : étoiles des contrats, puis étape, puis pièces gagnées (même ordre que dans le jeu)
    adminDb().from("usine_saves").select("user_id, stage:state->stage, stars:state->stars, earned:state->earned").eq("room_id", roomId),
    // Quiz (réservé à l'admin pendant les tests) : sans la migration 0033, la requête échoue et l'onglet reste vide
    quiz ? adminDb().from("quiz_scores").select("user_id, game, level, format, cat, score, day, created_at").eq("room_id", roomId) : Promise.resolve({ data: null }),
  ]);
  const played = ((games ?? []) as unknown as Played[]);
  // Quiz en ligne : classement des parties à plusieurs, tes face-à-face et tes dernières parties
  const online = quiz && jeu === "quiz" ? await loadOnlineStats(roomId, ctx.user.id) : null;
  const tabs = [...Object.entries(GAME_TYPES).map(([id, t]) => ({ id, label: t.label })), { id: "defi", label: "Défi du jour" }, { id: "usine", label: "Usine de Noël" }, ...(quiz ? [{ id: "quiz", label: "Quiz" }] : [])];
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
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${t.id === tab.id ? "bg-indigo-600 text-white" : "sticker text-zinc-600"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab.id === "quiz" ? (() => {
        const rows = (quizRows ?? []) as ScoreRow[];
        if (!rows.length && !online?.standings.length) return <p className="text-sm text-zinc-500">Aucune partie de Quiz enregistrée pour l&apos;instant.</p>;
        const today = dailyFirst(rows, parisDay()), wins = dailyWins(rows), best = records(rows);
        const rec = (game: string, format: string, level: string) => best.get(`${game}|${format}|${level}`);
        const games = Object.keys(QUIZ_GAMES).filter((g) => g !== "daily" && ["normal", "survie"].some((f) => rec(g, f, "facile") || rec(g, f, "expert")));
        const cell = (r: ScoreRow | undefined, unit: string) => r
          ? <span className="block tabular-nums"><b>{r.score}</b> <span className="text-zinc-500">{unit}</span><span className="block truncate text-xs text-zinc-500">{person(r.user_id)?.name ?? "Ancien membre"}</span></span>
          : <span className="text-zinc-300">—</span>;
        const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
        return (
          <>
            {!!online?.standings.length && (
              <section className="rounded-[1.5rem] sticker p-4">
                <p className="mb-2 text-xs text-zinc-500">En ligne · victoires sur parties jouées (duels et parties à plusieurs)</p>
                <ol className="rows">
                  {online.standings.map((r, i) => (
                    <li key={r.user} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="flex w-6 justify-center">{i < 3 ? <Medal rank={i} /> : <span className="tabular-nums text-zinc-500">{i + 1}</span>}</span>
                      {who(r.user)}
                      <span className="text-right tabular-nums"><b>{r.wins}</b> <span className="text-zinc-500">/ {r.played}</span></span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {!!online?.duels.length && (
              <section className="rounded-[1.5rem] sticker p-4">
                <p className="mb-2 text-xs text-zinc-500">Tes duels · victoires, nuls, défaites</p>
                <ol className="rows">
                  {online.duels.map((h) => (
                    <li key={h.user} className="flex items-center gap-3 py-2.5 text-sm">
                      {who(h.user)}
                      <span className="flex gap-1.5 tabular-nums">
                        <span className="rounded-full bg-[#CDEBB5] px-2 py-0.5 font-bold">{h.w}</span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5">{h.d}</span>
                        <span className="rounded-full bg-[#FFC6D3] px-2 py-0.5 font-bold">{h.l}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {!!online?.recent.length && (
              <section className="rounded-[1.5rem] sticker p-4">
                <p className="mb-2 text-xs text-zinc-500">Tes dernières parties en ligne</p>
                <ol className="rows">
                  {online.recent.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center font-display text-xs font-bold ${r.win ? "bg-[#CDEBB5]" : r.draw ? "bg-zinc-100" : "bg-[#FFC6D3]"}`}>
                        {r.win ? "Victoire" : r.draw ? "Nul" : r.of > 2 ? `${r.rank}e / ${r.of}` : "Défaite"}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {r.scores.map((x) => `${person(x.user)?.name ?? "?"} ${x.score}`).join(" · ")}
                        <span className="block text-xs text-zinc-500">{QUIZ_GAMES[r.game] ?? "Défi sur mesure"} · {fmt(r.at)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <section className="rounded-[1.5rem] sticker p-4">
              <p className="mb-2 text-xs text-zinc-500">Défi du jour · aujourd&apos;hui (seule la première partie compte)</p>
              {today.length ? (
                <ol className="rows">
                  {today.map((r, i) => (
                    <li key={r.user_id} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="flex w-6 justify-center">{i < 3 ? <Medal rank={i} /> : <span className="tabular-nums text-zinc-500">{i + 1}</span>}</span>
                      {who(r.user_id)}
                      <span className="text-right tabular-nums"><b>{r.score}</b> <span className="text-zinc-500">pts</span></span>
                    </li>
                  ))}
                </ol>
              ) : <p className="py-2 text-sm text-zinc-500">Personne n&apos;a encore joué le défi aujourd&apos;hui.</p>}
            </section>
            {!!wins.length && (
              <section className="rounded-[1.5rem] sticker p-4">
                <p className="mb-2 text-xs text-zinc-500">Défis du jour gagnés · défis joués</p>
                <ol className="rows">
                  {wins.map((r, i) => (
                    <li key={r.user} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="flex w-6 justify-center">{i < 3 ? <Medal rank={i} /> : <span className="tabular-nums text-zinc-500">{i + 1}</span>}</span>
                      {who(r.user)}
                      <span className="text-right tabular-nums"><b>{r.wins}</b> <span className="text-zinc-500">j.</span> · {r.played}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {!!games.length && (
              <section className="rounded-[1.5rem] sticker p-4">
                <p className="mb-2 text-xs text-zinc-500">Records par jeu · 7 questions (survie : meilleure série)</p>
                <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 text-sm">
                  <span className="py-1.5 text-xs font-medium text-zinc-400">Jeu</span>
                  <span className="py-1.5 text-xs font-medium text-zinc-400">Classique</span>
                  <span className="py-1.5 text-xs font-medium text-zinc-400">Expert</span>
                  {games.map((g) => (
                    <div key={g} className="contents">
                      <span className="border-t border-zinc-100 py-2 font-medium">{QUIZ_GAMES[g]}{(rec(g, "survie", "facile") || rec(g, "survie", "expert")) && !(rec(g, "normal", "facile") || rec(g, "normal", "expert")) ? <span className="block text-xs font-normal text-zinc-500">survie</span> : null}</span>
                      <span className="border-t border-zinc-100 py-2">{cell(rec(g, "normal", "facile") ?? rec(g, "survie", "facile"), rec(g, "normal", "facile") ? "pts" : "d’affilée")}</span>
                      <span className="border-t border-zinc-100 py-2">{cell(rec(g, "normal", "expert") ?? rec(g, "survie", "expert"), rec(g, "normal", "expert") ? "pts" : "d’affilée")}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        );
      })() : tab.id === "usine" ? (() => {
        const rows = (usine ?? []).map((r) => ({ user: r.user_id as string, stage: Number(r.stage) || 0, stars: Number(r.stars) || 0, earned: Number(r.earned) || 0 }))
          .filter((r) => r.stage && person(r.user)).sort((a, b) => b.stars - a.stars || b.stage - a.stage || b.earned - a.earned);
        if (!rows.length) return <p className="text-sm text-zinc-500">Personne n&apos;a encore d&apos;usine.</p>;
        return (
          <section className="rounded-[1.5rem] sticker p-4">
            <p className="mb-2 text-xs text-zinc-500">Étoiles des contrats · à égalité : l&apos;étape, puis les pièces gagnées</p>
            <ol className="rows">
              {rows.map((r, i) => (
                <li key={r.user} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="flex w-6 justify-center">{i < 3 ? <Medal rank={i} /> : <span className="tabular-nums text-zinc-500">{i + 1}</span>}</span>
                  {who(r.user)}
                  <span className="text-right tabular-nums">
                    <b>{r.stars.toLocaleString("fr-FR")}</b> <span className="text-zinc-500">★</span>
                    <span className="block text-xs text-zinc-500">étape {r.stage} · {r.earned.toLocaleString("fr-FR")} pièces</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })() : tab.id === "defi" ? (() => {
        const rows = dailyStandings((daily ?? []) as DailyRow[]);
        if (!rows.length) return <p className="text-sm text-zinc-500">Personne n&apos;a encore réussi de défi du jour.</p>;
        return (
          <section className="rounded-[1.5rem] sticker p-4">
            <p className="mb-2 text-xs text-zinc-500">Jours remportés (meilleur score du jour) · défis réussis</p>
            <ol className="rows">
              {rows.map((r, i) => (
                <li key={r.user} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="flex w-6 justify-center">{i < 3 ? <Medal rank={i} /> : <span className="tabular-nums text-zinc-500">{i + 1}</span>}</span>
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
          <section className="rounded-[1.5rem] sticker p-4">
            <p className="mb-2 text-xs text-zinc-500">3 points la victoire, 1 l&apos;égalité · V / N / D · % de victoires</p>
            <ol className="rows">
              {rows.map((r, i) => (
                <li key={r.user} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="flex w-6 justify-center">{i < 3 ? <Medal rank={i} /> : <span className="tabular-nums text-zinc-500">{i + 1}</span>}</span>
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
