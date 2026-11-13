"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { adminDb } from "@/src/lib/db/server";
import { notify, roomMembers } from "@/src/modules/notifications/push";
import { getRoomContext } from "@/src/modules/rooms/context";
import { isKind, type Kind } from "./formats";
import { isTheme, PACK_SIZE, THEMES } from "./themes";

export type CustomQuestion = { text: string; kind: Kind; options?: string[] };
/** La question écrite par l'acheteur est-elle valable ? (null si oui, sinon le message à afficher) */
function customError(q: CustomQuestion, members: number) {
  if (!isKind(q.kind)) return "Format inconnu.";
  if (q.text.length < 5 || q.text.length > 200) return "La question doit faire entre 5 et 200 caractères.";
  if (q.kind === "choice" && (q.options?.length !== 2 || q.options.some((o) => !o || o.length > 60))) return "Écris les deux choix (60 caractères au plus).";
  if ((q.kind === "rank" || q.kind === "duo") && members < 3) return "Il faut au moins 3 membres pour ce format.";
  if (q.kind === "with" && members < 2) return "Il faut au moins 2 membres pour ce format.";
  return null;
}

/** Achète une question en plus (écrite par l'acheteur) ou un pack à thème (tiré au hasard) pour aujourd'hui.
 *  Renvoie l'id de la (première) question, ou un message d'erreur. */
export async function buyQuestion(roomId: string, theme: string | null, custom?: CustomQuestion): Promise<{ id?: string; error?: string }> {
  const c = await getRoomContext(roomId);
  if (!c) return { error: "Non autorisé." };
  if (theme !== null && !isTheme(theme)) return { error: "Thème inconnu." };
  let q: CustomQuestion | null = null;
  if (theme === null) {
    if (!custom) return { error: "Écris ta question." };
    q = { text: String(custom.text ?? "").trim(), kind: custom.kind, ...(custom.kind === "choice" ? { options: (custom.options ?? []).map((o) => String(o ?? "").trim()) } : {}) };
    const err = customError(q, c.members.length);
    if (err) return { error: err };
  }
  const { data, error } = await adminDb().rpc("buy_question", { r: roomId, u: c.user.id, theme, custom: q }).single<{ id: string; payload: { text: string } }>();
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
