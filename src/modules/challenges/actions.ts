"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/src/lib/db/server";
import { getRoomContext } from "@/src/modules/rooms/context";
import { TIMED, challengeDay, codeOf, gridOf, isPuzzle, kindFor, loadAttempt, loadPuzzleAttempt, loadSimple, motOf, puzzleFor, writeAttempt, type PuzzleKind, type Stamp } from "./data";
import { bestOf } from "./puzzles/compte";
import { checkHashi } from "./puzzles/hashi";
import { checkPicross } from "./puzzles/picross";
import { validQueens } from "./puzzles/queens";
import { replay } from "./puzzles/rush";
import { codeReward, playCode, type CodeAttempt, type CodeEntry } from "./code-daily";
import { motReward, playMot, type MotAttempt, type MotEntry } from "./mot-daily";
import { VALIDES } from "./mots";
import { rewardOf, scoreOf, sendProbe, sendWave, tryGuess } from "./orapa-daily";

const CHANGED = { error: "Le défi du jour a changé : recharge la page." };
const BUSY = { error: "Ça a bougé entre-temps, réessaie." }; // un autre envoi est passé juste avant (voir writeAttempt)

/** Membre de la salle, Orapa débloqué, et le défi du jour est bien Orapa (null sinon : il ne se joue pas les autres jours). */
async function orapaToday(roomId: string) {
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  const day = challengeDay();
  const k = await kindFor(roomId, day);
  if (!k.orapa) throw new Error("Orapa n'est pas débloqué");
  return k.kind === "orapa" ? { uid: c.user.id, day } : null;
}

/** Envoyer une onde dans la grille du jour. */
export async function dailyWave(roomId: string, from: string): Promise<{ error?: string }> {
  const t = await orapaToday(roomId);
  if (!t) return CHANGED;
  const a = await loadAttempt(roomId, t.uid, t.day);
  const next = sendWave(gridOf(roomId, t.day), a, String(from));
  if (!next) return { error: "Onde impossible (déjà envoyée, ou défi terminé)." };
  if (!(await writeAttempt(roomId, t.uid, t.day, "orapa", a.stamp, { log: next.log, misses: next.misses }))) return BUSY;
  revalidatePath(`/r/${roomId}/games/defi`);
  return {};
}

/** Demander la couleur d'une case de la grille du jour (compte 2). */
export async function dailyProbe(roomId: string, cell: number): Promise<{ error?: string }> {
  const t = await orapaToday(roomId);
  if (!t) return CHANGED;
  const a = await loadAttempt(roomId, t.uid, t.day);
  const next = sendProbe(gridOf(roomId, t.day), a, cell);
  if (!next) return { error: "Case déjà demandée, ou défi terminé." };
  if (!(await writeAttempt(roomId, t.uid, t.day, "orapa", a.stamp, { log: next.log, misses: next.misses }))) return BUSY;
  revalidatePath(`/r/${roomId}/games/defi`);
  return {};
}

/** Tenter une grille : juste = défi réussi et pièces gagnées ; faux = +3 au score. */
export async function dailyGuess(roomId: string, grid: unknown): Promise<{ right?: boolean; reward?: number; error?: string }> {
  const t = await orapaToday(roomId);
  if (!t) return CHANGED;
  const a = await loadAttempt(roomId, t.uid, t.day);
  const res = tryGuess(gridOf(roomId, t.day), a, grid);
  if (!res) return { error: "Défi déjà terminé." };
  if (!res.right) {
    if (!(await writeAttempt(roomId, t.uid, t.day, "orapa", a.stamp, { log: res.attempt.log, misses: res.attempt.misses }))) return BUSY;
    revalidatePath(`/r/${roomId}/games/defi`);
    return { right: false };
  }
  const score = scoreOf(res.attempt), reward = rewardOf(score);
  // Une seule écriture marque le défi trouvé, et seulement si rien n'a bougé depuis la lecture : on ne paie que dans ce cas.
  if (!(await writeAttempt(roomId, t.uid, t.day, "orapa", a.stamp, { log: res.attempt.log, misses: res.attempt.misses, solved_at: new Date().toISOString(), score, reward }))) return BUSY;
  await adminDb().rpc("farm_add_items", { r: roomId, u: t.uid, delta: { coins: reward } });
  revalidatePath(`/r/${roomId}`, "layout");
  return { right: true, reward };
}

/** Enregistre un essai (false si un autre envoi est passé entre-temps) ; si le défi vient d'être réussi, le marque trouvé et paie, une seule fois. */
async function record(roomId: string, uid: string, day: string, kind: "code" | "mot", stamp: Stamp, log: unknown[], solved: boolean, reward: number) {
  const found = solved ? { solved_at: new Date().toISOString(), score: log.length, reward } : {};
  if (!(await writeAttempt(roomId, uid, day, kind, stamp, { log, misses: 0, ...found }))) return false;
  if (solved) await adminDb().rpc("farm_add_items", { r: roomId, u: uid, delta: { coins: reward } });
  return true;
}

/** Membre de la salle, et le défi du jour est bien celui-là. */
async function today(roomId: string, kind: "code" | "mot") {
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  const day = challengeDay();
  const k = await kindFor(roomId, day);
  if (k.kind !== kind) return null;
  return { uid: c.user.id, day, orapa: k.orapa };
}

/** Code secret : proposer 4 couleurs. */
export async function codeGuess(roomId: string, guess: unknown): Promise<{ error?: string; solved?: boolean; reward?: number }> {
  const t = await today(roomId, "code");
  if (!t) return CHANGED;
  const a = await loadSimple<CodeEntry>(roomId, t.uid, "code", t.day);
  const next = playCode(codeOf(roomId, t.day), a as CodeAttempt, guess);
  if (!next) return { error: "Défi terminé, ou code incomplet." };
  const reward = codeReward(next.log.length);
  if (!(await record(roomId, t.uid, t.day, "code", a.stamp, next.log, next.solved, reward))) return BUSY;
  revalidatePath(`/r/${roomId}`, "layout");
  return { solved: next.solved, reward: next.solved ? reward : undefined };
}

/** Mot du jour : proposer un mot de 5 lettres. */
export async function motGuess(roomId: string, word: unknown): Promise<{ error?: string; solved?: boolean; reward?: number }> {
  const t = await today(roomId, "mot");
  if (!t) return CHANGED;
  const a = await loadSimple<MotEntry>(roomId, t.uid, "mot", t.day);
  const res = playMot(motOf(roomId, t.day, t.orapa), a as MotAttempt, word, (w) => VALIDES.has(w));
  if ("error" in res) return { error: res.error };
  const next = res.attempt, reward = motReward(next.log.length);
  if (!(await record(roomId, t.uid, t.day, "mot", a.stamp, next.log, next.solved, reward))) return BUSY;
  revalidatePath(`/r/${roomId}`, "layout");
  return { solved: next.solved, reward: next.solved ? reward : undefined };
}

// ---------- Jeux de réflexion ----------

/** Gain d'un jeu chronométré : 200, moins 20 par vérification ratée et 10 par tranche de 5 minutes, jamais moins de 50. */
const timedReward = (seconds: number, misses: number) => Math.max(50, Math.min(200, 200 - 20 * misses - 10 * Math.floor(seconds / 300)));
const rushReward = (moves: number, min: number) => Math.max(50, 200 - 10 * (moves - min));
const compteReward = (distance: number) => (distance === 0 ? 200 : distance <= 5 ? 120 : distance <= 10 ? 80 : 40);

/**
 * Proposer une solution au défi du jour.
 * Picross, Reines, Hashi : juste = trouvé (score = temps + 1 min par essai raté) ; faux = un essai raté.
 * Embouteillage, Le compte est bon : chaque proposition valable compte, on garde la meilleure (et on paie la différence).
 */
export async function submitPuzzle(roomId: string, kind: PuzzleKind, answer: unknown): Promise<{ error?: string; right?: boolean; reward?: number; score?: number }> {
  const c = await getRoomContext(roomId);
  if (!c) throw new Error("Non autorisé");
  const uid = c.user.id, day = challengeDay();
  const k = await kindFor(roomId, day);
  if (k.kind !== kind || !isPuzzle(kind)) return CHANGED;
  const data = puzzleFor(roomId, day, kind);
  const a = await loadPuzzleAttempt(roomId, uid, kind, day, true);
  const admin = adminDb();
  const now = new Date();
  const pay = async (amount: number) => { if (amount > 0) await admin.rpc("farm_add_items", { r: roomId, u: uid, delta: { coins: amount } }); };

  if (TIMED.includes(kind)) {
    if (a.solved) return { error: "Déjà trouvé aujourd'hui." };
    const right = data.kind === "picross" ? checkPicross(data.puzzle, answer) : data.kind === "queens" ? validQueens(data.puzzle, answer) : data.kind === "hashi" ? checkHashi(data.puzzle, answer) : false;
    if (!right) {
      if (!(await writeAttempt(roomId, uid, day, kind, a.stamp, { misses: a.misses + 1 }))) return BUSY;
      revalidatePath(`/r/${roomId}/games/defi`);
      return { right: false };
    }
    const seconds = Math.max(1, Math.round((now.getTime() - Date.parse(a.startedAt)) / 1000));
    const score = seconds + 60 * a.misses, reward = timedReward(seconds, a.misses);
    const { data: done } = await admin.from("daily_challenges").update({ solved_at: now.toISOString(), score, reward, updated_at: now.toISOString() })
      .eq("room_id", roomId).eq("user_id", uid).eq("day", day).eq("kind", kind).is("solved_at", null).select("reward");
    if (done?.length) await pay(reward);
    revalidatePath(`/r/${roomId}`, "layout");
    return { right: true, reward, score };
  }

  // Embouteillage et Le compte est bon : la meilleure proposition compte.
  let score: number, reward: number;
  if (data.kind === "rush") {
    const moves = replay(data.puzzle, answer);
    if (moves === null) return { error: "Ces déplacements ne sortent pas la charrette." };
    score = moves; reward = rushReward(moves, data.min);
  } else if (data.kind === "compte") {
    const b = bestOf(data.puzzle, answer);
    if (!b) return { error: "Calcul impossible." };
    score = b.distance * 10 + b.steps; reward = compteReward(b.distance);
  } else return { error: "Défi inconnu." };
  if (a.solved && a.score !== null && a.score <= score) return { right: true, score: a.score, reward: 0 };
  const extra = Math.max(0, reward - (a.reward ?? 0));
  // Seulement si rien n'a bougé depuis la lecture : la même réponse envoyée plusieurs fois d'un coup n'est payée qu'une fois.
  if (!(await writeAttempt(roomId, uid, day, kind, a.stamp, { solved_at: now.toISOString(), score, reward: Math.max(reward, a.reward ?? 0) }))) return BUSY;
  await pay(extra);
  revalidatePath(`/r/${roomId}`, "layout");
  return { right: true, reward: extra, score };
}
