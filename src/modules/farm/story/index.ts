import { ch1 } from "./ch1.ts";
import type { Chapter } from "./types.ts";

/** Les chapitres écrits, dans l'ordre. Pour en ajouter un : créer chN.ts et l'ajouter ici. */
export const CHAPTERS: Chapter[] = [ch1];
export const chapterOf = (n: number) => CHAPTERS.find((c) => c.n === n);
