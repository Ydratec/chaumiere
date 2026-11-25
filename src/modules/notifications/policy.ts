// Règles anti-spam des notifications (module pur, testé dans tests/unit/notifications-policy.test.ts).
// « pour toi » (me) : on te défie, c'est ton tour, on a relevé ton défi… : passent toujours, sauf la nuit (gardées
//   pour le matin) et sauf si tu es déjà dans l'appli quand l'envoi le demande (skipIfActive).
// « salle » (room) : une partie lancée, quelqu'un a répondu, la serre… : limitées. Revenir sur l'appli remet
//   les compteurs à zéro (seules comptent les notifications envoyées depuis ta dernière visite).

export type Level = "me" | "room";
export type Sent = { topic: string; sender: string | null; at: number };

export const LIMITS = {
  senderMinutes: 30, // au plus une notification « salle » par personne qui envoie, toutes les 30 min
  perHour: 4, // au plus 4 notifications « salle » par heure…
  perDay: 12, // … et 12 sur 24 h
  activeMinutes: 2, // « dans l'appli » = vu il y a moins de 2 min
  quietFrom: 22, // heures calmes (heure de Paris)
  quietTo: 8,
};
/** Sujets « une seule fois tant que tu n'es pas revenu » : une invitation au quiz suffit pour savoir qu'on joue. */
export const ONCE_TOPICS = new Set(["quiz"]);

const MIN = 60_000;

export function parisHour(now: Date) {
  const part = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Paris" }).formatToParts(now).find((p) => p.type === "hour");
  return Number(part?.value ?? 12);
}
export const isQuiet = (now: Date) => {
  const h = parisHour(now);
  return h >= LIMITS.quietFrom || h < LIMITS.quietTo;
};

/** Une notification « salle » peut-elle partir vers cette personne ? (`seen` : sa dernière visite, en ms) */
export function roomAllowed(o: { sent: Sent[]; seen: number; now: number; topic: string; sender?: string | null }) {
  const recent = o.sent.filter((s) => s.at > o.seen); // depuis sa dernière visite seulement
  if (o.sender && recent.some((s) => s.sender === o.sender && s.at > o.now - LIMITS.senderMinutes * MIN)) return false;
  if (ONCE_TOPICS.has(o.topic) && recent.some((s) => s.topic === o.topic)) return false;
  if (recent.filter((s) => s.at > o.now - 60 * MIN).length >= LIMITS.perHour) return false;
  if (recent.filter((s) => s.at > o.now - 24 * 60 * MIN).length >= LIMITS.perDay) return false;
  return true;
}

/** Le résumé du matin : une seule notification pour tout ce qui est arrivé pendant la nuit. */
export function digest(items: { title: string; body: string; url: string }[]) {
  const lines = items.map((x) => (x.body ? `${x.title} : ${x.body}` : x.title));
  const shown = lines.slice(0, 3).join(" · ");
  return {
    title: items.length > 1 ? `Pendant la nuit (${items.length})` : "Pendant la nuit",
    body: (items.length > 3 ? `${shown} · et ${items.length - 3} de plus` : shown).slice(0, 300),
    url: items[items.length - 1]?.url ?? "/",
    tag: "digest",
  };
}
