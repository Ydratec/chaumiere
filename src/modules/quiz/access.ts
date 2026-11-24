// Quiz : qui le voit. Pour l'instant : le super-admin et les testeurs listés dans QUIZ_TESTERS
// (identifiants de connexion séparés par des virgules, comme SUPERADMINS) ; l'usine reste en place pour les autres.
// Pour l'ouvrir à toute la salle : passer QUIZ_OPEN à true (onglet, page, accueil, classement, API et notifications suivent).
import { isSuperAdmin } from "@/src/modules/admin/guard";

export const QUIZ_OPEN = false;

export function quizVisible(user: { email?: string } | null | undefined) {
  if (QUIZ_OPEN || isSuperAdmin(user)) return true;
  const id = user?.email?.split("@")[0]?.toLowerCase();
  const testers = (process.env.QUIZ_TESTERS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!id && testers.includes(id);
}
