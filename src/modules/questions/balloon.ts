// La montgolfière de la salle (fonctions pures, testées dans tests/unit/balloon.test.ts).
// Chaque jour où tous les membres actifs ont répondu à la question du jour, elle monte d'un cran ; un jour raté, elle
// redescend d'un cran (et la série de jours d'affilée repart à zéro). Actif = a répondu au moins une fois sur 7 jours.

export type DayAnswers = { day: string; users: string[] }; // question du jour (slot 0) : qui a répondu
export type Flight = {
  level: number;
  streak: number; // jours d'affilée réussis (aujourd'hui compris s'il est déjà réussi)
  best: number; // plus longue série
  today: { done: boolean; active: string[]; answered: string[]; missing: string[] };
  log: { day: string; ok: boolean }[]; // jours terminés (et aujourd'hui s'il est réussi)
};

export const ACTIVE_DAYS = 7;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Membres actifs le jour `day` : ceux qui ont répondu au moins une fois entre day-6 et day. */
export function activeOn(byDay: Map<string, Set<string>>, members: string[], day: string) {
  const seen = new Set<string>();
  for (let i = 0; i < ACTIVE_DAYS; i++) for (const u of byDay.get(addDays(day, -i)) ?? []) seen.add(u);
  return members.filter((m) => seen.has(m));
}

/** `start` : premier jour compté (les jours d'avant servent seulement à savoir qui est actif). */
export function flight(days: DayAnswers[], members: string[], today: string, start?: string): Flight {
  const byDay = new Map(days.map((d) => [d.day, new Set(d.users)]));
  const earliest = days.map((d) => d.day).sort()[0] ?? today;
  const first = start && start > earliest ? start : earliest;
  let level = 0, streak = 0, best = 0;
  const log: Flight["log"] = [];
  const judge = (day: string) => {
    const active = activeOn(byDay, members, day);
    const answered = members.filter((m) => byDay.get(day)?.has(m));
    return { active, answered, missing: active.filter((m) => !answered.includes(m)) };
  };
  for (let day = first; day < today; day = addDays(day, 1)) {
    const j = judge(day);
    if (!j.active.length) continue; // personne d'actif : la journée ne compte pas
    const ok = j.missing.length === 0;
    log.push({ day, ok });
    if (ok) {
      level++;
      streak++;
      best = Math.max(best, streak);
    } else {
      level = Math.max(0, level - 1);
      streak = 0;
    }
  }
  const t = judge(today);
  const done = t.active.length > 0 && t.missing.length === 0;
  if (done) {
    level++;
    streak++;
    best = Math.max(best, streak);
    log.push({ day: today, ok: true });
  }
  return { level, streak, best, today: { done, ...t }, log };
}

/** Altitude (mètres) d'un niveau : elle grandit de 35 % par cran, pour croiser tours, montagnes, avions… puis l'espace. */
export const altitude = (level: number) => (level <= 0 ? 0 : Math.round(20 * 1.35 ** level));
/** Premier niveau qui atteint cette altitude. */
export const levelFor = (meters: number) => (meters <= 0 ? 0 : Math.max(1, Math.ceil(Math.log(meters / 20) / Math.log(1.35))));

export type Landmark = { alt: number; name: string; icon: string; note?: string };

/** Ce qu'on croise en montant (altitudes réelles, arrondies). */
export const LANDMARKS: Landmark[] = [
  { alt: 30, name: "La lanterne du Colonel", icon: "🏮", note: "Hou. Je ne vous ai pas vus passer." },
  { alt: 69, name: "Notre-Dame de Paris", icon: "⛪" },
  { alt: 93, name: "La statue de la Liberté", icon: "🗽" },
  { alt: 210, name: "La tour Montparnasse", icon: "🏢" },
  { alt: 330, name: "La tour Eiffel", icon: "🗼" },
  { alt: 443, name: "L'Empire State Building", icon: "🏙️" },
  { alt: 828, name: "Burj Khalifa", icon: "🏗️", note: "Le plus haut gratte-ciel du monde." },
  { alt: 1465, name: "Le puy de Dôme", icon: "⛰️" },
  { alt: 3000, name: "Des oies sauvages en migration", icon: "🪿" },
  { alt: 4806, name: "Le mont Blanc", icon: "🏔️" },
  { alt: 8849, name: "L'Everest", icon: "🏔️", note: "Il fait −40 °C dans la nacelle." },
  { alt: 11000, name: "Un avion de ligne", icon: "✈️", note: "Les passagers font coucou." },
  { alt: 11300, name: "Un vautour de Rüppell", icon: "🦅", note: "L'oiseau qui vole le plus haut du monde." },
  { alt: 18000, name: "Le Concorde", icon: "🛩️" },
  { alt: 30000, name: "Un ballon météo", icon: "🎈" },
  { alt: 39000, name: "Le saut de Felix Baumgartner", icon: "🪂" },
  { alt: 100000, name: "La ligne de Kármán : l'espace !", icon: "🌌" },
  { alt: 200000, name: "Le gant perdu d'Ed White (1965)", icon: "🧤", note: "Le premier objet perdu dans l'espace." },
  { alt: 408000, name: "La Station spatiale internationale", icon: "🛰️" },
  { alt: 540000, name: "Le télescope Hubble", icon: "🔭" },
  { alt: 2_000_000, name: "Une chaussette perdue dans l'espace", icon: "🧦", note: "Personne ne sait d'où elle vient." },
  { alt: 20_200_000, name: "Les satellites GPS", icon: "📡", note: "« Dans 300 mètres, tournez à gauche. »" },
  { alt: 35_786_000, name: "L'orbite géostationnaire", icon: "📺" },
  { alt: 100_000_000, name: "Une voiture de sport rouge", icon: "🚗", note: "Un mannequin en scaphandre au volant." },
  { alt: 380_000_000, name: "Une vache qui saute par-dessus la Lune", icon: "🐄" },
  { alt: 384_400_000, name: "La Lune", icon: "🌕", note: "On a marché sur la Lune !" },
  { alt: 1_000_000_000, name: "Une théière en orbite", icon: "🫖", note: "Personne ne peut prouver qu'elle n'est pas là." },
  { alt: 54_600_000_000, name: "Mars", icon: "🔴" },
  { alt: 24_000_000_000_000, name: "La sonde Voyager 1", icon: "🛸", note: "Le point le plus lointain atteint par l'humanité." },
];

/** Dernier repère dépassé et prochain à atteindre. */
export function around(meters: number) {
  const passed = [...LANDMARKS].reverse().find((l) => l.alt <= meters) ?? null;
  const next = LANDMARKS.find((l) => l.alt > meters) ?? null;
  return { passed, next };
}

/** Altitude lisible : « 330 m », « 8,8 km », « 384 400 km ». */
export function formatAlt(m: number) {
  if (m < 1000) return `${m} m`;
  const km = m / 1000;
  return `${km < 100 ? km.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : Math.round(km).toLocaleString("fr-FR")} km`;
}
