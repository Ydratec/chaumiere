import Link from "next/link";
import { Avatar } from "@/src/components/avatar";
import { redirect } from "next/navigation";
import { ensureFarm, giftedToday, loadFarm, loadOffers, loadProjects, touchActivity } from "@/src/modules/farm/data";
import { catchUpNote } from "@/src/modules/farm/story/catchup";
import { loadStory } from "@/src/modules/farm/story/data";
import { StoryView } from "@/src/modules/farm/story/story-view";
import { GiftButton } from "@/src/modules/farm/gift-button";
import { FarmTabs } from "@/src/modules/farm/farm-tabs";
import { FarmView } from "@/src/modules/farm/farm-view";
import { Market } from "@/src/modules/farm/market";
import { ProjectsView } from "@/src/modules/farm/projects-view";
import { getRoomContext } from "@/src/modules/rooms/context";

export default async function FarmPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ u?: string }>;
}) {
  const { roomId } = await params;
  const { u } = await searchParams;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");

  // Visite de la ferme d'un ami (lecture seule).
  if (u && u !== ctx.user.id && ctx.names[u]) {
    const [farm, mine, done] = await Promise.all([loadFarm(roomId, u), loadFarm(roomId, ctx.user.id), giftedToday(roomId, ctx.user.id, u)]);
    return (
      <div className="space-y-6">
        <Link href={`/r/${roomId}/farm`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900">← Ma serre</Link>
        <FarmView roomId={roomId} initial={farm} character={ctx.people[u].character} owner={ctx.names[u]} names={ctx.names} />
        <GiftButton roomId={roomId} receiver={u} done={done} flowers={mine.items.flower ?? 0} />
      </div>
    );
  }

  await ensureFarm(roomId, ctx.user.id);
  const farm = await loadFarm(roomId, ctx.user.id);
  const [projects, offers, story] = await Promise.all([loadProjects(roomId, farm.unlocks), loadOffers(roomId), loadStory(roomId, ctx.user.id, farm), touchActivity(roomId, ctx.user.id, farm.story)]).then(([p, o, s]) => [p, o, s] as const);
  const friends = ctx.members.filter((m) => m.user_id !== ctx.user.id);

  return (
    <FarmTabs
      roomId={roomId}
      tabs={[
        // key : la vue repart des données fraîches après un rafraîchissement (don, échange…)
        {
          label: "Ma serre",
          content: (
            <div className="space-y-6">
              {friends.length > 0 && (
                <section>
                  <h3 className="eyebrow mb-2">Serres des amis</h3>
                  <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1" data-no-swipe>
                    {friends.map((m) => (
                      <Link key={m.user_id} href={`/r/${roomId}/farm?u=${m.user_id}`} className="flex w-14 shrink-0 flex-col items-center gap-1.5 text-center">
                        <Avatar url={m.avatar_url} character={m.character} name={m.username} size={48} />
                        <span className="w-full truncate text-xs text-zinc-600">{m.username}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              <FarmView key={farm.now} roomId={roomId} initial={farm} character={ctx.people[ctx.user.id].character} names={ctx.names} />
            </div>
          ),
        },
        ...(story
          ? [{
              label: "Histoire",
              badge: story.orders.filter((o) => !o.done).length,
              content: <StoryView key={farm.now} roomId={roomId} story={story} items={farm.items} catchNote={catchUpNote(farm.story.catch)} />,
            }]
          : []),
        { label: "Projets", badge: projects.length, content: <ProjectsView roomId={roomId} projects={projects} unlocks={farm.unlocks} items={farm.items} names={ctx.names} /> },
        { label: "Marché", badge: offers.filter((o) => o.seller !== ctx.user.id).length, content: <Market roomId={roomId} offers={offers} items={farm.items} userId={ctx.user.id} members={ctx.members} /> },
      ]}
    />
  );
}
