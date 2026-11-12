import { redirect } from "next/navigation";
import { getRoomContext } from "@/src/modules/rooms/context";
import { adminDb } from "@/src/lib/db/server";
import { SerreClosing } from "@/src/modules/usine/serre-closing";

// Usine de Noël : le jeu remplace la serre. C'est une page autonome (public/usine/jeu), affichée dans un cadre
// plein écran au-dessus de la barre d'onglets ; le cadre isole ses styles et son script du reste de l'app.
// ponytail: prototype tel quel (partie sauvegardée dans le navigateur) ; à brancher sur la salle (pièces, personnage) ensuite.
export default async function FarmPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  // première visite : la serre est vendue, un pop-up l'annonce (voir src/modules/usine/serre.ts)
  const { data: sold } = await adminDb().from("farm_stats").select("key").eq("room_id", roomId).eq("user_id", ctx.user.id).eq("key", "usine:serre-vendue").maybeSingle();
  const closing = !sold;
  const character = ctx.people[ctx.user.id].character; // le personnage de la salle, avec le bonnet de Noël dans l'usine
  return (
    <>
    {closing && <SerreClosing roomId={roomId} />}
    <iframe
      src={`/usine/jeu/index.html?room=${roomId}&sp=${character.species}&co=${character.color}`}
      title="Usine de Noël"
      className="fixed inset-x-0 top-0 z-[9] w-full border-0 bg-[#1b120d]"
      style={{ height: "calc(100dvh - 5.5rem - env(safe-area-inset-bottom))" }}
    />
    </>
  );
}
