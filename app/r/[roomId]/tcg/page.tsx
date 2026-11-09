import { redirect } from "next/navigation";
import { adminDb } from "@/src/lib/db/server";
import { getRoomContext } from "@/src/modules/rooms/context";
import { TcgCollection } from "@/src/modules/tcg/collection";
import { loadOffers } from "@/src/modules/tcg/data";

export default async function TcgPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const [{ data: wallet }, offers] = await Promise.all([
    adminDb().from("farm_items").select("qty").eq("room_id", roomId).eq("user_id", ctx.user.id).eq("item", "coins").maybeSingle(),
    loadOffers(ctx.sb, roomId, ctx.user.id),
  ]);
  return <TcgCollection roomId={roomId} userId={ctx.user.id} coins={wallet?.qty ?? 0} offers={offers} />;
}
