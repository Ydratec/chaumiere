// Super-admin de l'app (pas l'admin d'une salle) : identifiants de connexion listés dans SUPERADMINS (.env.local).
import type { User } from "@supabase/supabase-js";

export function isSuperAdmin(user: User | null | undefined) {
  const id = user?.email?.split("@")[0];
  const allowed = (process.env.SUPERADMINS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!id && allowed.includes(id);
}
