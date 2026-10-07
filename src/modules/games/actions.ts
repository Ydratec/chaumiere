"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { adminDb } from "@/src/lib/db/server";
import { getRoomContext } from "@/src/modules/rooms/context";
import { loadUnlocks } from "@/src/modules/farm/data";
import { GAME_LOCKS } from "@/src/modules/farm/projects";
import { notify, roomMembers } from "@/src/modules/notifications/push";
import { ENGINES } from "./engines";
import { GAME_TYPES, isGameType, type GameState } from "./labels";

export type Game = {
  id: string;
  room_id: string;
  type: string;
  creator: string;
  target: string | null;
  opponent: string | null;
  status: "open" | "playing" | "finished" | "cancelled";
  state: GameState | null;
  version: number;
};

/** Charge la partie (service role) et vérifie que l'utilisateur est membre de sa salle. */
async function load(gameId: string) {
  const admin = adminDb();
  const { data: game } = await admin.from("games").select("*").eq("id", gameId).single<Game>();
  const c = game && (await getRoomContext(game.room_id));
  if (!game || !c) throw new Error("Non autorisé");
  return { admin, game, uid: c.user.id, names: c.names };
}

const label = (g: Game) => (isGameType(g.type) ? GAME_TYPES[g.type].label : "Partie");
const url = (g: Pick<Game, "room_id" | "id">) => `/r/${g.room_id}/games/${g.id}`;
/** Notification de jeu, envoyée après la réponse (ne ralentit pas le coup joué). */
const tell = (to: string[], g: Pick<Game, "room_id" | "id">, title: string, body: string) =>
  after(() => notify(to, "games", { title, body, url: url(g), tag: `game-${g.id}` }));

/** Défi lancé à toute la salle (target vide) ou à un joueur. Un nouveau défi remplace le précédent encore ouvert. */
export async function createGame(f: FormData) {
  const roomId = String(f.get("room_id"));
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  const target = String(f.get("target")) || null;
  if (target && (target === c.user.id || !c.names[target])) return;

  const type = String(f.get("type"));
  if (!isGameType(type)) return;
  const lock = GAME_LOCKS[type]; // certains jeux se débloquent avec un projet de la ferme
  if (lock && !(await loadUnlocks(roomId)).includes(lock)) return;

  const admin = adminDb();
  await admin.from("games").update({ status: "cancelled" }).eq("room_id", roomId).eq("creator", c.user.id).eq("status", "open");
  const { data } = await admin.from("games").insert({ room_id: roomId, type, creator: c.user.id, target }).select("id").single();
  const id = data?.id;
  const to = target ? [target] : await roomMembers(roomId, c.user.id);
  if (id) tell(to, { room_id: roomId, id }, `${c.names[c.user.id]} te défie`, GAME_TYPES[type].label);
  redirect(`/r/${roomId}/games/${id}`);
}

export async function acceptGame(f: FormData) {
  const { admin, game, uid, names } = await load(String(f.get("game_id")));
  if (game.status !== "open" || game.creator === uid || (game.target && game.target !== uid)) return;

  const engine = isGameType(game.type) ? ENGINES[game.type] : null;
  if (!engine) return;
  const { state, secret } = engine.start(game.creator, uid);
  // status = 'open' dans le filtre : un seul joueur peut accepter une invitation ouverte à la salle.
  const { data } = await admin
    .from("games")
    .update({ status: "playing", opponent: uid, state, version: 1 })
    .eq("id", game.id).eq("status", "open").select("id");
  if (data?.length) {
    await admin.from("game_secrets").insert({ game_id: game.id, deck: secret });
    tell([game.creator], game, `${names[uid]} a relevé ton défi`, label(game));
  }
  redirect(`/r/${game.room_id}/games/${game.id}`);
}

/** Annuler son défi, ou refuser un défi qui nous vise. */
export async function cancelGame(f: FormData) {
  const { admin, game, uid } = await load(String(f.get("game_id")));
  if (game.status !== "open" || (game.creator !== uid && game.target !== uid)) return;
  await admin.from("games").update({ status: "cancelled" }).eq("id", game.id).eq("status", "open");
  redirect(`/r/${game.room_id}/games`);
}

/** Joue un coup (format propre à chaque jeu). Renvoie le nouvel état ; le client le reçoit aussi en temps réel. */
export async function playMove(gameId: string, move: unknown) {
  // Verrou optimiste : si l'autre joueur a joué entre-temps, on recharge et on rejoue le coup.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { admin, game, uid, names } = await load(gameId);
    if (game.status !== "playing" || !game.state || !isGameType(game.type)) return null;
    const { data: secret } = await admin.from("game_secrets").select("deck").eq("game_id", gameId).single<{ deck: unknown }>();
    const res = secret && ENGINES[game.type].play(game.state, secret.deck, move, uid);
    if (!res) return null;
    if (res.secretPatch) await admin.rpc("merge_game_secret", { g: gameId, patch: res.secretPatch }); // idempotent

    const status = res.state.winner ? "finished" : "playing";
    const { data } = await admin
      .from("games")
      .update({ state: res.state, status, version: game.version + 1 })
      .eq("id", gameId).eq("version", game.version)
      .select("version");
    if (data?.length) {
      const other = uid === game.creator ? game.opponent! : game.creator;
      const s = res.state as GameState;
      if (s.winner) tell([other], game, "Partie terminée", s.winner === "draw" ? `${label(game)} : égalité` : s.winner === uid ? `${label(game)} : ${names[uid]} a gagné` : `${label(game)} : tu as gagné !`);
      else if (s.turn === other && (game.state.turn !== other || s.phase !== game.state.phase)) tell([other], game, "À toi de jouer", `${label(game)} contre ${names[uid]}`);
      return { state: s, status: status as Game["status"], version: game.version + 1 };
    }
  }
  return null;
}

/** Abandonner une partie en cours : l'adversaire gagne. */
export async function forfeitGame(gameId: string) {
  const { admin, game, uid, names } = await load(gameId);
  if (game.status !== "playing" || !game.state || (uid !== game.creator && uid !== game.opponent)) return null;
  const engine = isGameType(game.type) ? ENGINES[game.type] : null;
  let state: GameState = { ...game.state, winner: uid === game.creator ? game.opponent! : game.creator, forfeit: uid };
  if (engine?.reveal) {
    const { data: secret } = await admin.from("game_secrets").select("deck").eq("game_id", gameId).single<{ deck: unknown }>();
    if (secret) state = { ...state, ...engine.reveal(state, secret.deck) };
  }
  const { data } = await admin
    .from("games")
    .update({ state, status: "finished", version: game.version + 1 })
    .eq("id", gameId).eq("version", game.version)
    .select("version");
  if (!data?.length) return null;
  tell([state.winner as string], game, "Partie terminée", `${label(game)} : ${names[uid]} a abandonné, tu gagnes !`);
  return { state, status: "finished" as const, version: game.version + 1 };
}
