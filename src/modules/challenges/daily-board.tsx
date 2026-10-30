import { Avatar } from "@/src/components/avatar";
import type { Person } from "@/src/modules/rooms/context";
import type { Ranking } from "./data";
import { CHALLENGES, type ChallengeKind } from "./rotation";

/** Classement d'un défi du jour (aujourd'hui, ou hier avec le jeu d'hier). */
export function Board({ title, rows, me, people, kind, live = false }: { title: string; rows: Ranking; me: string; people: Record<string, Person>; kind: ChallengeKind; live?: boolean }) {
  if (!rows.length) return live ? <p className="text-center text-sm text-zinc-500">Personne n&apos;a encore commencé aujourd&apos;hui. À toi !</p> : null;
  let rank = 0;
  return (
    <section>
      <h3 className="eyebrow mb-1">{title}</h3>
      <ol className="rows">
        {rows.map((r) => {
          if (r.solved) rank++;
          const p = people[r.user];
          return (
            <li key={r.user} className={`flex items-center gap-3 py-2.5 text-sm ${r.user === me ? "font-semibold" : ""}`}>
              <span className="w-5 text-right tabular-nums text-zinc-400">{r.solved ? rank : "·"}</span>
              <Avatar url={p?.url} character={p?.character} name={p?.name ?? "?"} size={28} />
              <span className="flex-1 truncate">{p?.name ?? "?"}</span>
              <span className={`tabular-nums ${r.solved ? "" : "text-zinc-400"}`}>
                {r.solved ? CHALLENGES[kind].unit(r.score) : r.failed ? "raté" : "cherche encore…"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
