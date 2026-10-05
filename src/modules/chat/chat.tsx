"use client";

import { useEffect, useRef, useState } from "react";
import { browserDb } from "@/src/lib/db/client";

export type Message = { id: number; user_id: string; content: string };

export function Chat({
  activityId,
  userId,
  names,
  initial,
}: {
  activityId: string;
  userId: string;
  names: Record<string, string>;
  initial: Message[];
}) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [sb] = useState(browserDb);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = sb
      .channel(`chat-${activityId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `activity_id=eq.${activityId}` },
        (p) => {
          const m = p.new as Message;
          setMessages((all) => (all.some((x) => x.id === m.id) ? all : [...all, m]));
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [sb, activityId]);

  useEffect(() => bottom.current?.scrollIntoView({ block: "nearest" }), [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    const { error } = await sb.from("messages").insert({ activity_id: activityId, content });
    if (error) setText(content);
  }

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5">
      <h3 className="mb-3 text-lg font-bold">Discussion</h3>
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <p key={m.id} className={`text-sm ${m.user_id === userId ? "text-right" : ""}`}>
            <span className="font-semibold">{names[m.user_id] ?? "?"}</span>{" "}
            <span className="whitespace-pre-wrap text-zinc-700">{m.content}</span>
          </p>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder="Un message…"
          className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 outline-none focus:border-indigo-500"
        />
        <button className="rounded-xl bg-indigo-600 px-4 font-semibold text-white hover:bg-indigo-700">
          Envoyer
        </button>
      </form>
    </section>
  );
}
