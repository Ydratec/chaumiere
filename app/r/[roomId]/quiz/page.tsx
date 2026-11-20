import { redirect } from "next/navigation";
import { quizVisible } from "@/src/modules/quiz/access";
import { getRoomContext } from "@/src/modules/rooms/context";

// Géo Quiz : page autonome (public/quiz), affichée dans un cadre plein écran au-dessus de la barre d'onglets,
// comme l'usine ; le cadre isole ses styles et son script du reste de l'app. Réservé à l'admin pendant les tests (voir access.ts).
export default async function QuizPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  if (!quizVisible(ctx.user)) redirect(`/r/${roomId}`);
  return (
    <iframe
      src={`/quiz/index.html?room=${roomId}`}
      title="Géo Quiz"
      className="fixed inset-x-0 top-0 z-[9] w-full border-0 bg-[#050506]"
      style={{ height: "calc(100dvh - 5.5rem - env(safe-area-inset-bottom))" }}
    />
  );
}
