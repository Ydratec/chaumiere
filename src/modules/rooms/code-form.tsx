"use client";

import { useActionState } from "react";
import { changeCode } from "./actions";

export function CodeForm({ roomId, code }: { roomId: string; code: string }) {
  const [msg, action, pending] = useActionState(changeCode, "");
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="room_id" value={roomId} />
      <div className="flex gap-2">
        <input name="code" defaultValue={code} required className="field min-w-0 flex-1 bg-white font-mono shadow-sm" />
        <button disabled={pending} className="btn px-4">
          Changer
        </button>
      </div>
      {msg && <p className="text-sm text-zinc-600">{msg}</p>}
    </form>
  );
}
