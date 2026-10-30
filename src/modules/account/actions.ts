"use server";

import { createClient } from "@supabase/supabase-js";
import { adminDb } from "@/src/lib/db/server";
import { getAuthUser } from "@/src/modules/rooms/context";

/** Changer son code PIN : il faut l'ancien (vérifié sans toucher à la session en cours), puis deux fois le nouveau. */
export async function changePin(_prev: { ok: boolean; text: string } | null, f: FormData) {
  const me = await getAuthUser();
  if (!me?.email) return { ok: false, text: "Reconnecte-toi d'abord." };
  const old = String(f.get("old") ?? ""), pin = String(f.get("pin") ?? ""), again = String(f.get("again") ?? "");
  if (![old, pin].every((p) => /^\d{4}$/.test(p))) return { ok: false, text: "Un code PIN, c'est exactement 4 chiffres." };
  if (pin !== again) return { ok: false, text: "Les deux nouveaux codes ne sont pas identiques." };
  if (pin === old) return { ok: false, text: "Le nouveau code est le même que l'ancien." };
  // Vérifie l'ancien PIN avec un client à part (sans cookies) : la session de l'app reste telle quelle.
  const check = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: wrong } = await check.auth.signInWithPassword({ email: me.email, password: old + process.env.AUTH_PEPPER });
  if (wrong) return { ok: false, text: "L'ancien code PIN n'est pas le bon." };
  await check.auth.signOut();
  const { error } = await adminDb().auth.admin.updateUserById(me.id, { password: pin + process.env.AUTH_PEPPER });
  return error ? { ok: false, text: "Impossible de changer le code pour l'instant." } : { ok: true, text: "C'est fait : utilise ton nouveau code PIN à la prochaine connexion." };
}
