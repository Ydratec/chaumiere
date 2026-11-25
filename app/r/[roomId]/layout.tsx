import { redirect } from "next/navigation";
import { SwipeNav } from "@/src/components/swipe-nav";
import { TabBar } from "@/src/components/tab-bar";
import { adminDb } from "@/src/lib/db/server";
import { SERRE_OPEN } from "@/src/modules/farm/closed";
import { TrimNotice } from "@/src/modules/farm/trim-notice";
import { chapterOf } from "@/src/modules/farm/story";
import { StoryTeaser } from "@/src/modules/farm/story/teaser";
import { ScratchTeaser } from "@/src/modules/scratch/teaser";
import { getMyRooms, getRoomContext } from "@/src/modules/rooms/context";
import { RoomSwitcher } from "@/src/modules/rooms/room-switcher";
import { NewsPopup } from "@/src/modules/news/popup";
import { Presence } from "@/src/modules/notifications/presence";
import { quizVisible } from "@/src/modules/quiz/access";

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
  // Serre fermée : ni fenêtre d'histoire, ni avis « objets retirés » (et pas de requête pour rien à chaque page).
  const [rooms, trims] = await Promise.all([
    getMyRooms().then((r) => r ?? []),
    SERRE_OPEN
      ? adminDb().from("farm_journal").select("page").eq("room_id", roomId).eq("user_id", ctx.user.id).like("page", "trim:%").order("at", { ascending: false }).limit(1).then((r) => r.data)
      : null,
  ]);

  return (
    <div className="min-h-screen pb-28 text-zinc-900">
      <header className="px-4 pb-2 pt-4">
        <div className="mx-auto max-w-md">
          <RoomSwitcher roomId={roomId} name={ctx.roomName ?? "?"} avatar={ctx.roomAvatar} rooms={rooms} />
        </div>
      </header>
      <main className="mx-auto max-w-md space-y-7 px-4 py-4">{children}</main>
      <Presence />
      {SERRE_OPEN && chapterOf(ctx.chapter) && <StoryTeaser roomId={roomId} chapter={ctx.chapter} phase={ctx.storyDay < 1 ? "soon" : "live"} />}
      <ScratchTeaser roomId={roomId} />
      <NewsPopup roomId={roomId} />
      {trims?.[0] && <TrimNotice roomId={roomId} page={trims[0].page} />}
      <TabBar roomId={roomId} quiz={quizVisible(ctx.user)} />
      <SwipeNav roomId={roomId} quiz={quizVisible(ctx.user)} />
    </div>
  );
}
