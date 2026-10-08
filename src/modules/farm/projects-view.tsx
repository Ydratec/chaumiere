"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { contribute } from "./actions";
import { ItemIcon } from "./art";
import { ITEMS, type Inventory, type ItemId } from "./catalog";
import type { ProjectState } from "./data";
import { PROJECTS, remaining } from "./projects";

const KIND = { game: "Mini-jeu", pack: "Questions", cosmetic: "Cosmétique", upgrade: "Amélioration" } as const;

export function ProjectsView({ roomId, projects, unlocks, items, names }: {
  roomId: string;
  projects: ProjectState[];
  unlocks: string[];
  items: Inventory;
  names: Record<string, string>;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();
  const done = PROJECTS.filter((p) => unlocks.includes(p.key));

  const [open, setOpen] = useState<{ key: string; item: ItemId; qty: number } | null>(null); // sélecteur de quantité ouvert
  const give = (project: string, item: ItemId, qty: number) =>
    startTransition(async () => {
      setOpen(null);
      setMsg(await contribute(roomId, project, item, qty));
      router.refresh();
    });

  return (
    <div className="space-y-8">
      {msg && <p role="alert" className="text-center text-sm text-red-700">{msg}</p>}
      {projects.length === 0 && <p className="text-sm text-zinc-500">Tous les projets sont terminés. Bravo à la salle !</p>}

      {projects.map((p) => {
        const top = Object.entries(p.givers).sort((a, b) => b[1] - a[1]).slice(0, 3);
        return (
          <section key={p.key} className="panel space-y-4">
            <div>
              <p className="eyebrow">{KIND[p.kind]}</p>
              <h3 className="text-lg font-bold tracking-tight">{p.title}</h3>
              <p className="text-sm text-zinc-500">{p.desc}</p>
            </div>
            <div className="space-y-3">
              {(Object.entries(p.needs) as [ItemId, number][]).map(([item, need]) => {
                const got = Math.min(need, p.progress[item] ?? 0);
                const left = remaining(p, p.progress, item);
                const mine = items[item] ?? 0;
                const max = Math.min(mine, left);
                const sel = open?.key === p.key && open.item === item ? open : null;
                const set = (q: number) => setOpen({ key: p.key, item, qty: Math.max(1, Math.min(max, q)) });
                return (
                  <div key={item} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <ItemIcon id={item} size={28} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{ITEMS[item].name}</span>
                          <span className="tabular-nums text-zinc-500">{got} / {need}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${(got / need) * 100}%` }} />
                        </div>
                      </div>
                      <button
                        disabled={pending || !max}
                        onClick={() => (sel ? setOpen(null) : set(1))}
                        className="btn-soft w-20 px-2 py-1.5 text-xs"
                      >
                        {!left ? "Complet" : mine ? (sel ? "Fermer" : "Donner") : "Aucun"}
                      </button>
                    </div>
                    {sel && (
                      <div className="animate-pop flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-50 p-2">
                        <div className="flex items-center rounded-full bg-white shadow-sm">
                          <button onClick={() => set(sel.qty - 1)} aria-label="Moins" className="size-8 rounded-full text-lg font-bold text-zinc-500">−</button>
                          <span className="w-8 text-center font-semibold tabular-nums">{sel.qty}</span>
                          <button onClick={() => set(sel.qty + 1)} aria-label="Plus" className="size-8 rounded-full text-lg font-bold text-zinc-500">+</button>
                        </div>
                        <button onClick={() => set(1)} className="btn-soft px-2.5 py-1 text-xs">1</button>
                        <button onClick={() => set(Math.ceil(max / 2))} className="btn-soft px-2.5 py-1 text-xs">Moitié</button>
                        <button onClick={() => set(max)} className="btn-soft px-2.5 py-1 text-xs">Max ({max})</button>
                        <button disabled={pending} onClick={() => give(p.key, item, sel.qty)} className="btn ml-auto px-3 py-1.5 text-xs">
                          Donner {sel.qty}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {top.length > 0 && (
              <p className="text-xs text-zinc-500">Merci à {top.map(([u, n]) => `${names[u] ?? "?"} (${n})`).join(", ")}</p>
            )}
          </section>
        );
      })}

      {done.length > 0 && (
        <section>
          <h3 className="eyebrow mb-1">Débloqué par la salle</h3>
          <ul className="rows text-sm">
            {done.map((p) => (
              <li key={p.key} className="flex justify-between py-2.5">
                <span>{p.title}</span>
                <span className="text-zinc-500">{KIND[p.kind]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
