// Règles anti-spam des notifications (module pur, testé dans tests/unit/notifications-policy.test.ts).
// « pour toi » (me) : on te défie, c'est ton tour, on a relevé ton défi… : passent toujours, sauf si tu es déjà
//   dans l'appli quand l'envoi le demande (skipIfActive).
// « salle » (room) : une partie lancée, quelqu'un a répondu, la serre… : limitées. Revenir sur l'appli remet
//   les compteurs à zéro (seules comptent les notifications envoyées depuis ta dernière visite).

export type Level = "me" | "room";
export type Sent = { topic: string; sender: string | null; at: number };

export const LIMITS = {
  senderMinutes: 30, // au plus une notification « salle » par personne qui envoie, toutes les 30 min
  perHour: 4, // au plus 4 notifications « salle » par heure…
  perDay: 12, // … et 12 sur 24 h
  activeMinutes: 2, // « dans l'appli » = vu il y a moins de 2 min
};
/** Sujets « une seule fois tant que tu n'es pas revenu » : une invitation au quiz suffit pour savoir qu'on joue. */
export const ONCE_TOPICS = new Set(["quiz"]);

const MIN = 60_000;

/** Une notification « salle » peut-elle partir vers cette personne ? (`seen` : sa dernière visite, en ms) */
export function roomAllowed(o: { sent: Sent[]; seen: number; now: number; topic: string; sender?: string | null }) {
  const recent = o.sent.filter((s) => s.at > o.seen); // depuis sa dernière visite seulement
  if (o.sender && recent.some((s) => s.sender === o.sender && s.at > o.now - LIMITS.senderMinutes * MIN)) return false;
  if (ONCE_TOPICS.has(o.topic) && recent.some((s) => s.topic === o.topic)) return false;
  if (recent.filter((s) => s.at > o.now - 60 * MIN).length >= LIMITS.perHour) return false;
  if (recent.filter((s) => s.at > o.now - 24 * 60 * MIN).length >= LIMITS.perDay) return false;
  return true;
}
