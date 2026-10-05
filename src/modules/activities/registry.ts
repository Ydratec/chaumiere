import type { ComponentType } from "react";
import { QuestionActivity } from "../questions/question";

export type Activity = { id: string; type: string; payload: { text: string } };
export type Answer = { user_id: string; content: string };
export type ActivityProps = {
  activity: Activity;
  userId: string;
  names: Record<string, string>;
  answers: Answer[];
};

// Pour ajouter un mini-jeu : un composant + une ligne ici + insérer une daily_activities avec ce `type`.
export const registry: Record<string, ComponentType<ActivityProps>> = {
  question: QuestionActivity,
};
