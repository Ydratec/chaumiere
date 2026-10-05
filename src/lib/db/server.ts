import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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

/** Client service-role : contourne la RLS, serveur uniquement. */
export function adminDb() {
  return createClient(url, process.env.SUPABASE_SECRET_KEY!);
}
