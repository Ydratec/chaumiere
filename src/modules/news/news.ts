// Annonces : une fenêtre dans l'app (une fois par appareil) et une notification push (une fois par personne),
// entre `from` et `until`. Pour en ajouter une : une entrée ici, rien d'autre (pas de migration).
import type { Who } from "../farm/story/types.ts";

export type News = {
  id: string; // ne jamais réutiliser : sert à ne l'envoyer qu'une fois
  from: string; // ISO, début de l'annonce
  until: string; // ISO, fin de l'annonce
  who: Who; // personnage sur la fenêtre
  eyebrow: string;
  title: string;
  text: string;
  points?: string[];
  push: { title: string; body: string };
  cta: string;
};

export const NEWS: News[] = [
  {
    id: "brumes-annonce",
    from: "2026-10-26T00:00:00+01:00",
    until: "2026-10-28T00:00:00+01:00",
    who: "mirabelle",
    eyebrow: "À la serre · dès mardi",
    title: "La brume s'épaissit…",
    text: "Quelqu'un attend toujours sur le vieux pont. L'histoire reprend dès demain, et cette fois elle se joue directement dans ta serre.",
    points: [
      "Épisode 3 · La grande brume : un nouveau chapitre chaque jour, du 27 au 29 octobre",
      "Épisode 4 · La Fête des Brumes : la grande nuit d'Halloween, du 30 octobre au 2 novembre",
      "Citrouilles, lanternes et nouvelles choses à faire dans la serre",
    ],
    push: { title: "La brume s'épaissit…", body: "L'histoire reprend demain à la serre, et la Fête des Brumes arrive pour Halloween." },
    cta: "J'ai hâte !",
  },
];

/** Annonces en cours à ce moment. */
export const activeNews = (now: number) => NEWS.filter((n) => Date.parse(n.from) <= now && now < Date.parse(n.until));
