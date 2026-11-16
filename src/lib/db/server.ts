import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Client Supabase au nom de l'utilisateur connecté (RLS appliquée). */
export async function db() {
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // Interdit pendant un rendu de Server Component ; proxy.ts rafraîchit la session.
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

let admin: SupabaseClient | undefined;
/**
 * Client service-role : contourne la RLS, serveur uniquement.
 * Un seul pour tout le serveur (il n'a ni session ni cookies : rien n'est propre à une requête), au lieu d'un nouveau à chaque appel.
 * Ne jamais y connecter quelqu'un (auth.signIn…) : il servirait ensuite toutes les requêtes au nom de cette personne.
 */
export function adminDb() {
  return (admin ??= createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }));
}
