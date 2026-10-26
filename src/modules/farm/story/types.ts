// Moteur d'histoire : un chapitre = un fichier (ch1.ts…) qui décrit ses personnages, ses actes et ses quêtes.
import type { BuildingId, Inventory, ItemId } from "../catalog.ts";

export type Who = "mirabelle" | "pistache" | "colonel" | "zinnia" | "basile";
export type Line = { who: Who; text: string };

/** But d'une quête : livrer des objets, posséder des bâtiments, ou récolter N fois (compteur du chapitre). */
export type Goal =
  | { kind: "deliver"; items: Inventory }
  | { kind: "own"; building: BuildingId; n: number }
  | { kind: "harvest"; item: ItemId; n: number };

export type Reward = { coins?: number; items?: Inventory; unlocks?: string[] };

export type Quest = {
  id: string;
  act: number;
  title: string;
  intro: Line[];
  outro: Line[];
  goal: Goal;
  reward: Reward;
  page: { title: string; text: string }; // page du journal de Mirabelle, gagnée en finissant la quête
  day?: number; // jour du chapitre où elle sort (sinon : dès que son acte sort)
  hour?: number; // heure de Paris de sa sortie, ce jour-là
  teaser?: string; // annoncé la veille (« demain… »)
  scenes?: { intro: Step[]; outro: Step[] }; // scènes jouées dans la serre (intro/outro en sont tirés pour le texte)
};

// ---------- Scènes jouées dans la serre (voir scene-player.tsx) ----------

/** Où se place un personnage : une case, la porte (en haut), le milieu, ou à côté du joueur. */
export type Spot = "door" | "center" | "player" | "left" | "right" | { x: number; y: number };
export type Emote = "heart" | "tear" | "surprise" | "laugh" | "music" | "zzz" | "dots" | "anger";
/** Ambiance : nuit (0 → 1), brume (0 → 1), lanternes allumées, pluie. */
export type Mood = { night: number; fog: number; lanterns: number; rain: boolean };
export type Prop = "letter" | "page" | "lantern" | "pumpkin" | "satchel" | "candle" | "cake" | "key";

export type Step =
  | { do: "enter"; who: Who; at?: Spot } // apparaît (fondu) à cet endroit, la porte par défaut
  | { do: "walk"; who: Who; to: Spot }
  | { do: "say"; who: Who; text: string; emote?: Emote }
  | { do: "narrate"; text: string } // texte du narrateur, en bas, sans personnage
  | { do: "emote"; who: Who | "player"; emote: Emote }
  | { do: "mood"; mood: Partial<Mood> }
  | { do: "prop"; prop: Prop; text?: string } // un objet montré en grand au milieu (toucher pour continuer)
  | { do: "choice"; options: { text: string; reply?: { who: Who; text: string } }[] }
  | { do: "leave"; who: Who; to?: Spot } // s'en va (vers la porte par défaut) puis disparaît
  | { do: "fade"; text?: string } // écran noir (avec un titre éventuel), puis retour
  | { do: "wait"; ms: number };

export type Act = { n: number; day: number; title: string; teaser: string };

export type Chapter = {
  n: number;
  title: string;
  trophy: string; // titre gagné en finissant le chapitre
  acts: Act[];
  quests: Quest[];
};
