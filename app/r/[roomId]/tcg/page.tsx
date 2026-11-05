import Link from "next/link";
import { redirect } from "next/navigation";
import { adminDb } from "@/src/lib/db/server";
import { getRoomContext } from "@/src/modules/rooms/context";
import { TcgCollection } from "@/src/modules/tcg/collection";

export default async function TcgPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const { data: wallet } = await adminDb().from("farm_items").select("qty").eq("room_id", roomId).eq("user_id", ctx.user.id).eq("item", "coins").maybeSingle();

  return (
    <div className="space-y-4">
      <Link href={`/r/${roomId}/games`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900">← Jeux</Link>
      <TcgCollection roomId={roomId} userId={ctx.user.id} coins={wallet?.qty ?? 0} />
    </div>
  );
}
