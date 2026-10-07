import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPanel } from "@/src/modules/admin/panel";
import { isSuperAdmin } from "@/src/modules/admin/guard";
import { getRoomContext } from "@/src/modules/rooms/context";

export default async function AdminPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx || !isSuperAdmin(ctx.user)) notFound();
  return (
    <>
      <div>
        <Link href={`/r/${roomId}/profile`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900">← Profil</Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Mode admin</h1>
      </div>
      <AdminPanel roomId={roomId} />
    </>
  );
}
