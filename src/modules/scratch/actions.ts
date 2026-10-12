"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/src/lib/db/server";
import { isFlower } from "@/src/modules/farm/flowers";
import { getRoomContext } from "@/src/modules/rooms/context";
import { drawTicket, isKind, PRIZES, TICKETS, type Layout } from "./tickets";

export type Card = { id: number; kind: string; layout: Layout };

/** Achète un ticket : le serveur tire le lot et la disposition (le client ne fait que gratter). */
export async function buyTicket(roomId: string, kind: string): Promise<{ card?: Card; error?: string }> {
  const c = await getRoomContext(roomId);
  if (!c) return { error: "Non autorisé." };
  if (!isKind(kind)) return { error: "Ticket inconnu." };
  const { layout, prize } = drawTicket(kind);
  const { data, error } = await adminDb().rpc("scratch_buy", {
    r: roomId, u: c.user.id, price: TICKETS[kind].price, k: kind, lay: layout, pz: prize ? PRIZES[prize].delta : null,
  });
  if (error) return { error: error.code === "23514" ? "Pas assez de pièces." : "Achat impossible pour l'instant." };
  revalidatePath(`/r/${roomId}`, "layout");
  return { card: { id: Number(data), kind, layout } };
}

/** Le ticket est gratté : verse le lot (une seule fois, garanti par la base). Renvoie ce qui a été gagné. */
export async function claimTicket(roomId: string, id: number): Promise<{ prize: Record<string, number> | null }> {
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  const admin = adminDb();
  const { data } = await admin.rpc("scratch_claim", { cid: id, u: c.user.id });
  const prize = (data as Record<string, number> | null) ?? null;
  if (prize) {
    for (const [k, v] of Object.entries(prize)) if (isFlower(k)) await admin.rpc("farm_stat_add", { r: roomId, u: c.user.id, k: `bloom:${k}`, n: v });
    revalidatePath(`/r/${roomId}`, "layout");
  }
  return { prize };
}
