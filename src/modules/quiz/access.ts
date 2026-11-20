// Géo Quiz : qui le voit. Pour l'instant réservé au super-admin (phase de test) ; l'usine reste en place pour tout le monde.
// Pour l'ouvrir à toute la salle : faire renvoyer `true` ici (onglet, page, accueil, classement et API suivent).
import { isSuperAdmin } from "@/src/modules/admin/guard";

export function quizVisible(user: { email?: string } | null | undefined) {
  return isSuperAdmin(user);
}
