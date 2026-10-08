"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { adminDb } from "@/src/lib/db/server";
import { notify, roomMembers } from "@/src/modules/notifications/push";
import { getRoomContext } from "@/src/modules/rooms/context";
import { isTheme, PACK_SIZE, THEMES } from "./themes";

/** Achète une question en plus (ou un pack à thème) pour aujourd'hui. Renvoie l'id de la (première) question, ou un message d'erreur. */
export async function buyQuestion(roomId: string, theme: string | null): Promise<{ id?: string; error?: string }> {
  const c = await getRoomContext(roomId);
  if (!c) return { error: "Non autorisé." };
  if (theme !== null && !isTheme(theme)) return { error: "Thème inconnu." };
  const { data, error } = await adminDb().rpc("buy_question", { r: roomId, u: c.user.id, theme }).single<{ id: string; payload: { text: string } }>();
  if (error || !data) return { error: error?.code === "23514" ? "Pas assez de pièces (gagne-en à la serre)." : "Achat impossible pour l'instant." };
  revalidatePath(`/r/${roomId}`, "layout");
  const who = c.names[c.user.id];
  after(async () =>
    notify(await roomMembers(roomId, c.user.id), "question", {
      title: theme ? `${who} a ouvert le pack « ${THEMES[theme]} »` : `${who} a ajouté une question`,
      body: theme ? `Une question par jour pendant ${PACK_SIZE} jours. Aujourd'hui : ${data.payload.text}` : data.payload.text,
      url: `/r/${roomId}/question?a=${data.id}`,
    }),
  );
  return { id: data.id };
}
