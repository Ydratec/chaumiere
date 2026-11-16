import { redirect } from "next/navigation";
import { getRoomContext } from "@/src/modules/rooms/context";
import { adminDb } from "@/src/lib/db/server";
import type { Gift } from "@/src/modules/farm/data";
import { FlowerGifts } from "@/src/modules/usine/flower-gifts";
import { SerreClosing } from "@/src/modules/usine/serre-closing";

// Usine de Noël : le jeu remplace la serre. C'est une page autonome (public/usine/jeu), affichée dans un cadre
// plein écran au-dessus de la barre d'onglets ; le cadre isole ses styles et son script du reste de l'app.
// ponytail: prototype tel quel (partie sauvegardée dans le navigateur) ; à brancher sur la salle (pièces, personnage) ensuite.
export default async function FarmPage({ params, searchParams }: { params: Promise<{ roomId: string }>; searchParams: Promise<{ u?: string }> }) {
  const [{ roomId }, { u }] = await Promise.all([params, searchParams]);
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  // première visite : la serre est vendue, un pop-up l'annonce (voir src/modules/usine/serre.ts)
  // et les cadeaux de fleurs qui attendent d'être ouverts (voir src/modules/usine/flower-gifts.tsx)
  const [{ data: sold }, { data: gifts }] = await Promise.all([
    adminDb().from("farm_stats").select("key").eq("room_id", roomId).eq("user_id", ctx.user.id).eq("key", "usine:serre-vendue").maybeSingle(),
    adminDb().from("farm_gifts").select("id, giver, item, contents, message, day").eq("room_id", roomId).eq("receiver", ctx.user.id).eq("opened", false).order("id"),
  ]);
  const closing = !sold;
  const character = ctx.people[ctx.user.id].character; // le personnage de la salle avec son accessoire (le bonnet de Noël s'il n'en a pas)
  // ?u=<membre> (depuis l'accueil) : le jeu ouvre directement l'usine de ce membre, en visite.
  const visit = u && u !== ctx.user.id && ctx.names[u] ? `&visit=${u}` : "";
  return (
    <>
    {closing && <SerreClosing roomId={roomId} />}
    <FlowerGifts roomId={roomId} gifts={(gifts ?? []) as Gift[]} names={ctx.names} />
    <iframe
      src={`/usine/jeu/index.html?room=${roomId}&sp=${character.species}&co=${character.color}${character.accessory ? `&ac=${character.accessory}` : ""}${visit}`}
      title="Usine de Noël"
      className="fixed inset-x-0 top-0 z-[9] w-full border-0 bg-[#1b120d]"
      style={{ height: "calc(100dvh - 5.5rem - env(safe-area-inset-bottom))" }}
    />
    </>
  );
}
