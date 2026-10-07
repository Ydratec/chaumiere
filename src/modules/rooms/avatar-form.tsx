"use client";

import { useRef } from "react";
import { setAvatar } from "./actions";

/** Choisir un fichier l'envoie directement. */
export function AvatarForm({
  roomId,
  target,
  children,
}: {
  roomId: string;
  target: "user" | "room";
  children?: React.ReactNode;
}) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={setAvatar} className="flex items-center gap-4">
      <input type="hidden" name="room_id" value={roomId} />
      <input type="hidden" name="target" value={target} />
      {children}
      <label className="btn-soft cursor-pointer">
        Changer la photo
        <input type="file" name="file" accept="image/*" hidden onChange={() => form.current?.requestSubmit()} />
      </label>
    </form>
  );
}
