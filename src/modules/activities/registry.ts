import type { ComponentType } from "react";
import type { Person } from "../rooms/context";
import { QuestionActivity } from "../questions/question";

export type Activity = { id: string; type: string; payload: { text: string; kind?: "open" | "vote" } };
export type Answer = { user_id: string; content: string };
export type ActivityProps = {
  activity: Activity;
  userId: string;
  names: Record<string, string>;
  people: Record<string, Person>;
  answers: Answer[];
};

// Pour ajouter un mini-jeu : un composant + une ligne ici + insérer une daily_activities avec ce `type`.
export const registry: Record<string, ComponentType<ActivityProps>> = {
  question: QuestionActivity,
};
