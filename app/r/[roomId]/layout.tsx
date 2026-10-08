import { redirect } from "next/navigation";
import { SwipeNav } from "@/src/components/swipe-nav";
import { TabBar } from "@/src/components/tab-bar";
import { chapterOf } from "@/src/modules/farm/story";
import { StoryTeaser } from "@/src/modules/farm/story/teaser";
import { getMyRooms, getRoomContext } from "@/src/modules/rooms/context";
import { RoomSwitcher } from "@/src/modules/rooms/room-switcher";

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
  const rooms = (await getMyRooms()) ?? [];

  return (
    <div className="min-h-screen pb-28 text-zinc-900">
      <header className="px-4 pb-2 pt-4">
        <div className="mx-auto max-w-md">
          <RoomSwitcher roomId={roomId} name={ctx.roomName ?? "?"} avatar={ctx.roomAvatar} rooms={rooms} />
        </div>
      </header>
      <main className="mx-auto max-w-md space-y-8 px-4 py-4">{children}</main>
      {chapterOf(ctx.chapter) && <StoryTeaser roomId={roomId} chapter={ctx.chapter} phase={ctx.storyDay < 1 ? "soon" : "live"} />}
      <TabBar roomId={roomId} isAdmin={ctx.isAdmin} />
      <SwipeNav roomId={roomId} isAdmin={ctx.isAdmin} />
    </div>
  );
}
