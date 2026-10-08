// Jour et heure de Paris pour la question du jour (fonctions pures, testées dans tests/unit/day.test.ts).

/** Date (AAAA-MM-JJ) et heure à Paris à l'instant `at`. */
export function paris(at: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** « Jour » de la question pour une salle dont la question change à `hour` h (même calcul que today_activity en SQL). */
export const questionDay = (hour: number, at = new Date()) => paris(new Date(at.getTime() - hour * 3_600_000)).date;

/** Heure de la notification : celle du changement, sauf la nuit (22 h → 7 h) où l'on attend 9 h. */
export const notifyHour = (hour: number) => (hour >= 8 && hour <= 21 ? hour : 9);
