"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/src/components/avatar";
import type { Person } from "@/src/modules/rooms/context";
import { Cat, MOODS, type Mood } from "@/src/components/cat";
import { Icon } from "@/src/components/icons";
import { browserDb } from "@/src/lib/db/client";
import { chatSent } from "@/src/modules/notifications/actions";
import { seenKey } from "@/src/components/tab-bar";

export type Message = { id: number; user_id: string; content: string };
export type Reaction = { message_id: number; user_id: string; emoji: string };

// Les réactions sont stockées par nom d'humeur ; un ancien emoji en base reste affiché tel quel.
const MOOD_COAT: Record<Mood, number> = { happy: 0, love: 3, laugh: 4, wow: 2, sad: 6, cool: 5 };
const Reacts = ({ k, size = 20 }: { k: string; size?: number }) =>
  (MOODS as readonly string[]).includes(k) ? <Cat mood={k as Mood} coat={MOOD_COAT[k as Mood]} size={size} /> : <>{k}</>;
const same = (a: Reaction, b: Reaction) =>
  a.message_id === b.message_id && a.user_id === b.user_id && a.emoji === b.emoji;

export function Chat({
  activityId,
  userId,
  names,
  people,
  initial,
  initialReactions,
}: {
  activityId: string;
  userId: string;
  names: Record<string, string>;
  people: Record<string, Person>;
  initial: Message[];
  initialReactions: Reaction[];
}) {
  const [messages, setMessages] = useState(initial);
  const [reactions, setReactions] = useState(initialReactions);
  const [typing, setTyping] = useState<string[]>([]);
  const [picker, setPicker] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [sb] = useState(browserDb);
  const bottom = useRef<HTMLDivElement>(null);
  const channel = useRef<ReturnType<typeof sb.channel> | null>(null);
  const lastTyping = useRef(0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const stopTyping = (id: string) => {
    clearTimeout(timers.current[id]);
    setTyping((t) => t.filter((x) => x !== id));
  };

  useEffect(() => {
    const ch = sb
      .channel(`chat-${activityId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `activity_id=eq.${activityId}` },
        (p) => {
          const m = p.new as Message;
          setMessages((all) => (all.some((x) => x.id === m.id) ? all : [...all, m]));
          stopTyping(m.user_id);
        },
      )
      // ponytail: pas de filtre (les DELETE n'en supportent pas) ; les réactions d'autres salons sont masquées par la RLS / ignorées à l'affichage.
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (p) => {
        const r = p.new as Reaction;
        setReactions((all) => (all.some((x) => same(x, r)) ? all : [...all, r]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (p) => {
        const r = p.old as Reaction;
        setReactions((all) => all.filter((x) => !same(x, r)));
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const id = payload.userId as string;
        clearTimeout(timers.current[id]);
        setTyping((t) => (t.includes(id) ? t : [...t, id]));
        timers.current[id] = setTimeout(() => stopTyping(id), 3000);
      })
      .subscribe();
    channel.current = ch;
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach(clearTimeout);
      sb.removeChannel(ch);
    };
  }, [sb, activityId]);

  // Discussion ouverte = messages lus (pour la pastille de l'onglet Question).
  const lastId = messages.at(-1)?.id ?? 0;
  useEffect(() => {
    try {
      localStorage.setItem(seenKey(activityId), String(lastId));
    } catch {}
  }, [activityId, lastId]);

  // Suivre la conversation seulement si on est déjà en bas de la page (ou si c'est notre message) :
  // pas de saut quand on lit la question en haut.
  const lastMine = messages.at(-1)?.user_id === userId;
  useEffect(() => {
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
    if (atBottom || lastMine) bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, typing.length, lastMine]);

  function onType(value: string) {
    setText(value);
    if (Date.now() - lastTyping.current < 2000) return;
    lastTyping.current = Date.now();
    channel.current?.send({ type: "broadcast", event: "typing", payload: { userId } });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    lastTyping.current = 0;
    const { error } = await sb.from("messages").insert({ activity_id: activityId, content });
    if (error) setText(content);
    else void chatSent(activityId); // prévient les autres (notification, limitée à une toutes les 10 min)
  }

  async function toggle(message_id: number, emoji: string) {
    setPicker(null);
    const r = { message_id, user_id: userId, emoji };
    const had = reactions.some((x) => same(x, r));
    setReactions((all) => (had ? all.filter((x) => !same(x, r)) : [...all, r]));
    const { error } = had
      ? await sb.from("message_reactions").delete().match(r)
      : await sb.from("message_reactions").insert(r);
    if (error) setReactions((all) => (had ? [...all, r] : all.filter((x) => !same(x, r))));
  }

  const who = typing.map((id) => names[id] ?? "?");

  return (
    <section>
      <h3 className="eyebrow mb-4">Discussion</h3>
      <div className="space-y-3">
        {messages.length === 0 && <p className="text-sm text-zinc-500">Aucun message : lance la discussion !</p>}
        {messages.map((m) => {
          const mine = m.user_id === userId;
          const name = names[m.user_id] ?? "?";
          const counts = new Map<string, Reaction[]>();
          reactions.filter((r) => r.message_id === m.id).forEach((r) => counts.set(r.emoji, [...(counts.get(r.emoji) ?? []), r]));
          return (
            <div key={m.id} className={`animate-pop flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              {!mine && <Avatar url={people[m.user_id]?.url} character={people[m.user_id]?.character} name={name} size={28} />}
              <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                {!mine && <span className="mb-0.5 px-1 text-xs text-zinc-500">{name}</span>}
                <div className={`flex items-center gap-1 ${mine ? "flex-row-reverse" : ""}`}>
                  <p
                    className={`whitespace-pre-wrap break-words rounded-[1.1rem] px-3.5 py-2 text-[15px] leading-snug ${
                      mine ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {m.content}
                  </p>
                  <button
                    type="button"
                    aria-label="Réagir"
                    onClick={() => setPicker(picker === m.id ? null : m.id)}
                    className="px-1 text-zinc-300 hover:text-zinc-600"
                  >
                    <Icon name="smile" size={18} />
                  </button>
                </div>
                {picker === m.id && (
                  <div className="animate-pop mt-1 inline-flex gap-1 rounded-full bg-white px-2 py-1 shadow-lg ring-1 ring-black/5">
                    {MOODS.map((e) => (
                      <button key={e} type="button" onClick={() => toggle(m.id, e)} className="transition-transform hover:scale-125">
                        <Reacts k={e} size={28} />
                      </button>
                    ))}
                  </div>
                )}
                {counts.size > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {[...counts].map(([emoji, list]) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => toggle(m.id, emoji)}
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          list.some((r) => r.user_id === userId) ? "bg-indigo-100 ring-1 ring-indigo-300" : "bg-zinc-100"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1"><Reacts k={emoji} size={16} /> {list.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {who.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            {who.join(" et ")} {who.length > 1 ? "écrivent" : "écrit"}
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block size-1.5 animate-bounce rounded-full bg-zinc-400"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </p>
        )}
        <div ref={bottom} />
      </div>
      {/* Saisie collée en bas de l'écran, juste au-dessus de la barre d'onglets. */}
      <form
        onSubmit={send}
        className="sticky bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.6rem)] z-10 mt-4 flex gap-2 rounded-full bg-white/90 p-1.5 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.3)] backdrop-blur-md"
      >
        <input
          value={text}
          onChange={(e) => onType(e.target.value)}
          maxLength={1000}
          placeholder="Un message…"
          className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-2.5 text-base outline-none placeholder:text-zinc-400"
        />
        <button aria-label="Envoyer" className="btn size-11 shrink-0 p-0">
          <Icon name="arrow" size={20} />
        </button>
      </form>
    </section>
  );
}
