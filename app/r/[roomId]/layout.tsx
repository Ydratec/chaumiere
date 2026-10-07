import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/src/components/logo";
import { Avatar } from "@/src/components/avatar";
import { SwipeNav } from "@/src/components/swipe-nav";
import { TabBar } from "@/src/components/tab-bar";
import { getRoomContext } from "@/src/modules/rooms/context";

export default async function RoomLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");

  return (
    <div className="min-h-screen pb-28 text-zinc-900">
      <header className="sticky top-0 z-10 bg-background/80 px-4 pb-2 pt-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Avatar url={ctx.roomAvatar} name={ctx.roomName ?? "?"} size={40} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Salle</p>
            <h1 className="truncate text-xl font-bold tracking-tight">{ctx.roomName}</h1>
          </div>
          <Link href="/" aria-label="Mes salles" title="Mes salles" className="rounded-full p-1 transition hover:bg-white">
            <Logo size={30} />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-md space-y-8 px-4 py-4">{children}</main>
      <TabBar roomId={roomId} isAdmin={ctx.isAdmin} />
      <SwipeNav roomId={roomId} isAdmin={ctx.isAdmin} />
    </div>
  );
}
