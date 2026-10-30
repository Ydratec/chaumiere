"use client";

import { useActionState } from "react";
import { changePin } from "./actions";

/** Changer son code PIN (ancien + nouveau deux fois). */
export function PinForm() {
  const [res, action, pending] = useActionState(changePin, null);
  const field = "field w-full bg-white text-center tracking-[0.4em] shadow-sm";
  const pin = { inputMode: "numeric" as const, pattern: "\\d{4}", maxLength: 4, required: true, autoComplete: "off" };
  return (
    <form action={action} key={res?.ok ? "done" : "form"} className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1 text-xs text-zinc-500">Ancien<input name="old" type="password" {...pin} className={field} /></label>
        <label className="space-y-1 text-xs text-zinc-500">Nouveau<input name="pin" type="password" {...pin} className={field} /></label>
        <label className="space-y-1 text-xs text-zinc-500">Encore<input name="again" type="password" {...pin} className={field} /></label>
      </div>
      <button disabled={pending} className="btn w-full">{pending ? "…" : "Changer mon code PIN"}</button>
      {res && <p role="status" className={`rounded-2xl px-4 py-2.5 text-center text-sm ${res.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{res.text}</p>}
    </form>
  );
}
