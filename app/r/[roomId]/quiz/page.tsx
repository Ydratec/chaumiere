import { redirect } from "next/navigation";
import { quizVisible } from "@/src/modules/quiz/access";
import { QuizFrame } from "@/src/modules/quiz/quiz-frame";
import { getRoomContext } from "@/src/modules/rooms/context";

// Quiz : page autonome (public/quiz), affichée dans un cadre plein écran au-dessus de la barre d'onglets,
// comme l'usine ; le cadre isole ses styles et son script du reste de l'app. Réservé aux testeurs pour l'instant (voir access.ts).
// ?m=<partie> (depuis une notification) : le jeu ouvre directement le salon de cette partie en ligne.
export default async function QuizPage({ params, searchParams }: { params: Promise<{ roomId: string }>; searchParams: Promise<{ m?: string }> }) {
  const [{ roomId }, { m }] = await Promise.all([params, searchParams]);
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  if (!quizVisible(ctx.user)) redirect(`/r/${roomId}`);
  return <QuizFrame roomId={roomId} match={m && /^[0-9a-f-]{36}$/.test(m) ? m : undefined} />;
}
