"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notify, roomMembers } from "@/src/modules/notifications/push";
import { adminDb } from "@/src/lib/db/server";
import { getRoomContext } from "@/src/modules/rooms/context";
import { BUILDINGS, GRID_W, ITEMS, isBuilding, isItem, type Inventory } from "./catalog";
import { loadFarm, loadProjects, type Farm, type Gift } from "./data";
import { randomGiftMessage } from "./gift-messages";
import { isComplete, remaining } from "./projects";
import { duration, gridH, negate, offerError, placeError, recipeOf, startError, tileAt, type FarmMove } from "./rules";

export type { FarmMove };

/** Un coup sur sa ferme. Renvoie la ferme à jour, ou un message d'erreur. */
export async function farmAction(roomId: string, move: FarmMove): Promise<{ farm: Farm; error?: string }> {
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  const uid = c.user.id;
  const admin = adminDb();
  const farm = await loadFarm(roomId, uid);
  // (x, y) peut viser n'importe quelle case d'un objet : on retrouve l'objet et son coin haut-gauche.
  const tile = "x" in move ? tileAt(farm.tiles, move.x, move.y) : undefined;
  const tiles = () => admin.from("farm_tiles");
  const where = <T extends { eq: (k: string, v: unknown) => T }>(q: T) =>
    q.eq("room_id", roomId).eq("user_id", uid).eq("x", tile!.x).eq("y", tile!.y);
  const add = (delta: Inventory) => admin.rpc("farm_add_items", { r: roomId, u: uid, delta });
  const done = async (error?: string) => ({ farm: await loadFarm(roomId, uid), error });

  switch (move.kind) {
    case "build": {
      if (!isBuilding(move.building)) return done("Bâtiment inconnu.");
      const err = placeError(farm.tiles, farm.items, move.building, move.x, move.y, farm.unlocks);
      if (err) return done(err);
      const { error } = await add({ coins: -BUILDINGS[move.building].cost });
      if (error) return done("Pas assez de pièces.");
      const ins = await tiles().insert({ room_id: roomId, user_id: uid, x: move.x, y: move.y, kind: move.building });
      if (ins.error) await add({ coins: BUILDINGS[move.building].cost }); // case prise entre-temps : remboursement
      return done(ins.error ? "Il y a déjà quelque chose ici." : undefined);
    }
    case "move": {
      if (!tile || !isBuilding(tile.kind)) return done("Rien à déplacer.");
      const to = { x: Math.floor(Number(move.to?.x)), y: Math.floor(Number(move.to?.y)) };
      const err = placeError(farm.tiles, farm.items, tile.kind, to.x, to.y, farm.unlocks, tile);
      if (err) return done(err);
      const { error } = await where(tiles().update({ x: to.x, y: to.y }));
      return done(error ? "Il y a déjà quelque chose ici." : undefined);
    }
    case "start": {
      const err = startError(tile, farm.items, move.recipe);
      if (err) return done(err);
      const r = recipeOf(tile!.kind, move.recipe)!;
      const { error } = await add(negate(r.inputs));
      if (error) return done("Il te manque des ingrédients.");
      const now = Date.now();
      const { data } = await where(tiles().update({ notified: false, item: r.id, started_at: new Date(now).toISOString(), ready_at: new Date(now + duration(r, farm.unlocks)).toISOString() }))
        .is("item", null).select("x");
      if (!data?.length) await add(r.inputs); // déjà lancé entre-temps : remboursement
      return done(data?.length ? undefined : "Déjà occupé.");
    }
    case "collect": {
      const r = tile && recipeOf(tile.kind, tile.item);
      if (!r) return done("Rien à récolter.");
      // Condition sur l'objet et l'échéance : une seule récolte possible, même avec deux clics.
      const { data } = await where(tiles().update({ item: null, started_at: null, ready_at: null }))
        .eq("item", r.id).lte("ready_at", new Date().toISOString()).select("x");
      if (!data?.length) return done("Pas encore prêt.");
      await add({ [r.out]: r.qty });
      return done();
    }
    case "clear": {
      if (!tile || tile.item) return done("Attends que ce soit fini avant de démolir.");
      await where(tiles().delete()).is("item", null);
      return done();
    }
    case "sell": {
      const qty = Math.floor(Number(move.qty));
      if (!isItem(move.item) || move.item === "coins" || !(qty > 0)) return done("Vente impossible.");
      const { error } = await add({ [move.item]: -qty, coins: qty * ITEMS[move.item].price });
      return done(error ? "Tu n'en as pas assez." : undefined);
    }
  }
  return done("Action inconnue.");
}

async function member(roomId: string) {
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  return c.user.id;
}

/** Donner à un projet de salle tout ce qu'on a de cet objet (sans dépasser ce qu'il manque). */
/** Donner `want` unités (ramené à ce qu'on a et à ce qu'il manque). */
export async function contribute(roomId: string, project: string, item: string, want: number) {
  const uid = await member(roomId);
  const farm = await loadFarm(roomId, uid);
  const p = (await loadProjects(roomId, farm.unlocks)).find((x) => x.key === project);
  if (!p || !isItem(item) || !(item in p.needs)) return "Ce projet n'en a pas besoin.";
  const asked = Math.floor(Number(want));
  if (!(asked >= 1)) return "Quantité invalide.";
  const qty = Math.min(asked, farm.items[item] ?? 0, remaining(p, p.progress, item));
  if (qty <= 0) return (farm.items[item] ?? 0) ? "Cet objet est déjà complet." : "Tu n'en as pas.";

  const admin = adminDb();
  const { error } = await admin.rpc("farm_contribute", { r: roomId, u: uid, p: project, it: item, n: qty });
  if (error) return "Tu n'en as pas assez.";
  const now = (await loadProjects(roomId, farm.unlocks)).find((x) => x.key === project);
  if (now && isComplete(now, now.progress)) {
    const { data: fresh } = await admin.from("room_unlocks").upsert({ room_id: roomId, key: project }, { ignoreDuplicates: true }).select("key");
    if (fresh?.length) { // débloqué à l'instant (une seule notification même si deux dons arrivent ensemble)
      const to = await roomMembers(roomId, uid);
      after(() => notify(to, "farm", { title: `Projet terminé : ${p.title}`, body: p.desc, url: `/r/${roomId}/farm`, tag: `project-${project}` }));
    }
  }
  revalidatePath(`/r/${roomId}`, "layout");
  return "";
}

export async function createOffer(roomId: string, give: Inventory, want: Inventory) {
  const uid = await member(roomId);
  const err = offerError(give, want);
  if (err) return err;
  const { error } = await adminDb().rpc("farm_offer_create", { r: roomId, s: uid, g: give, w: want });
  revalidatePath(`/r/${roomId}/farm`);
  return error ? "Tu n'as pas ce que tu proposes." : "";
}

export async function acceptOffer(roomId: string, offer: number) {
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  const admin = adminDb();
  const { data: o } = await admin.from("farm_offers").select("seller").eq("id", offer).eq("room_id", roomId).maybeSingle();
  const { data, error } = await admin.rpc("farm_offer_accept", { o: offer, r: roomId, b: c.user.id });
  revalidatePath(`/r/${roomId}/farm`);
  if (error) return "Il te manque ce qui est demandé.";
  if (data && o) after(() => notify([o.seller], "farm", { title: "Échange conclu", body: `${c.names[c.user.id]} a accepté ton offre au marché.`, url: `/r/${roomId}/farm`, tag: `offer-${offer}` }));
  return data ? "" : "Cette offre n'est plus disponible.";
}

export async function cancelOffer(roomId: string, offer: number) {
  const uid = await member(roomId);
  await adminDb().rpc("farm_offer_cancel", { o: offer, s: uid });
  revalidatePath(`/r/${roomId}/farm`);
  return "";
}

/** Enregistre où le chat s'est arrêté (visible des visiteurs). */
export async function moveCat(roomId: string, x: number, y: number) {
  const uid = await member(roomId);
  const farm = await loadFarm(roomId, uid);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= GRID_W || y >= gridH(farm.unlocks) || tileAt(farm.tiles, x, y)) return;
  await adminDb().from("farm_cats").upsert({ room_id: roomId, user_id: uid, x, y });
}

/** Laisser une fleur dans la serre d'un ami (une fois par jour et par ami, vérifié par la base). */
export async function giveGift(roomId: string, receiver: string) {
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  if (receiver === c.user.id || !c.names[receiver]) return "Impossible.";
  const { error } = await adminDb().rpc("farm_gift", { r: roomId, g: c.user.id, rcv: receiver, it: "flower", msg: randomGiftMessage() });
  if (error) return error.code === "23505" ? "Déjà offert aujourd'hui." : "Récolte une fleur d'abord.";
  after(() => notify([receiver], "farm", {
    title: "Un cadeau t'attend",
    body: `${c.names[c.user.id]} t'a laissé une fleur dans ta serre.`,
    url: `/r/${roomId}/farm`,
    tag: `gift-${roomId}`,
  }));
  revalidatePath(`/r/${roomId}/farm`);
  return "";
}

/** Ouvrir un cadeau reçu : la fleur rejoint la collection. Renvoie la serre à jour et le cadeau (qui, quel mot). */
export async function openGift(roomId: string, giftId: number) {
  const uid = await member(roomId);
  const { data } = await adminDb().rpc("farm_open_gift", { gid: giftId, rcv: uid });
  const g = (data as Gift[] | null)?.[0] ?? null;
  return { farm: await loadFarm(roomId, uid), gift: g };
}
