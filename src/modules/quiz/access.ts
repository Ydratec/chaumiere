// Quiz : qui le voit. Ouvert à toute la salle depuis la première version (géographie, histoire, pièces) :
// l'onglet Quiz remplace l'usine pour tout le monde (le code de l'usine reste en place).
// Pour le refermer aux seuls testeurs : QUIZ_OPEN à false (super-admin + QUIZ_TESTERS, identifiants séparés par des virgules).
import { isSuperAdmin } from "@/src/modules/admin/guard";

export const QUIZ_OPEN = true;

export function quizVisible(user: { email?: string } | null | undefined) {
  if (QUIZ_OPEN || isSuperAdmin(user)) return true;
  const id = user?.email?.split("@")[0]?.toLowerCase();
  const testers = (process.env.QUIZ_TESTERS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!id && testers.includes(id);
}
