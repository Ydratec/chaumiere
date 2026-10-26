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
  // Jour 17 (la veille de sa sortie) : il est déjà en cours, donc pas de notification en double avec l'annonce (news.ts).
  {
    id: "bocal", day: 17, days: 7, title: "Le grand bocal de bonbons",
    text: "Pour la Fête des Brumes, Zinnia veut remplir le grand bocal du hameau. Atelier de cuisine, canne à sucre, et quatre paliers à débloquer ensemble d'ici la nuit du 31.",
    scene: {
      lines: [
        { who: "zinnia", text: "Tu as vu ce que j'ai trouvé au grenier de la mairie ? Le grand bocal de la Fête ! Il est plus grand que moi." },
        { who: "zinnia", text: "Avant, le soir de la Fête des Brumes, on le remplissait de bonbons, et chaque enfant qui portait une lanterne pouvait se servir." },
        { who: "colonel", text: "Hou. Il n'y a plus d'enfants, Zinnia. Il n'y a plus de lanternes. Il n'y a plus de Fête." },
        { who: "zinnia", text: "Il y aura tout ça. Si le bocal est plein le 31 au soir, il y aura tout ça. J'en suis sûre." },
        { who: "mirabelle", text: "Plante de la canne à sucre dans tes bacs, mon petit chou, et monte-toi un atelier de cuisine. Bonbons à la fraise, bonbons aux fleurs… et ma confiture, si tu es sage." },
        { who: "pistache", text: "Je surveillerai le bocal. Personnellement. De très près. Avec la bouche, si besoin." },
      ],
      coins: 40,
    },
  },
];

export const activeEvents = (day: number) => EVENTS.filter((e) => day >= e.day && day < e.day + e.days);

/** Coefficients des événements en cours, sous forme de déblocages (« speed:0.8 », « sell:1.25 »). */
export const eventKeys = (day: number) =>
  activeEvents(day).flatMap((e) => [e.speed ? `speed:${e.speed}` : "", e.sell ? `sell:${e.sell}` : ""]).filter(Boolean);
