// Événements du chapitre : annoncés le jour J (notification + bannière), ils ne sont pas dévoilés avant.
import type { Line } from "./types.ts";

export type StoryEvent = {
  id: string;
  day: number; // jour du chapitre où il commence
  days: number; // durée
  title: string;
  text: string;
  speed?: number; // × durée des recettes pendant l'événement
  sell?: number; // × prix de vente
  scene?: { lines: Line[]; coins: number }; // petite scène à voir une fois, avec un cadeau
};

export const EVENTS: StoryEvent[] = [
  { id: "marche", day: 3, days: 2, title: "Le marché de Zinnia", text: "Zinnia ouvre son étal sur la place : tout se vend 25 % plus cher pendant deux jours.", sell: 1.25 },
  {
    id: "visite", day: 5, days: 2, title: "Pistache passe en coup de vent",
    text: "Quelqu'un a laissé quelque chose devant la porte de la serre…",
    scene: {
      lines: [
        { who: "pistache", text: "Chut ! Ne te retourne pas. Je ne suis pas là." },
        { who: "pistache", text: "J'ai trouvé ça dans la forêt. Je ne sais pas à qui c'est. Je me suis dit : à lui, sûrement." },
        { who: "pistache", text: "Garde-le. Et surtout, ne dis à personne que le voleur d'œufs fait des cadeaux. J'ai une réputation." },
      ],
      coins: 60,
    },
  },
  { id: "etoiles", day: 10, days: 2, title: "La nuit d'étoiles", text: "La brume s'écarte ce soir : tout pousse un cinquième plus vite pendant deux jours.", speed: 0.8 },
];

export const activeEvents = (day: number) => EVENTS.filter((e) => day >= e.day && day < e.day + e.days);

/** Coefficients des événements en cours, sous forme de déblocages (« speed:0.8 », « sell:1.25 »). */
export const eventKeys = (day: number) =>
  activeEvents(day).flatMap((e) => [e.speed ? `speed:${e.speed}` : "", e.sell ? `sell:${e.sell}` : ""]).filter(Boolean);
