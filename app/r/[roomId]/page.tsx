import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/src/components/avatar";
import type { Activity } from "@/src/modules/activities/registry";
import { SERRE_OPEN } from "@/src/modules/farm/closed";
import { readyCount } from "@/src/modules/farm/data";
import { adminDb } from "@/src/lib/db/server";
import { isSuperAdmin } from "@/src/modules/admin/guard";
import { loadInbox } from "@/src/modules/feedback/data";
import { FeedbackInbox } from "@/src/modules/feedback/inbox";
import { GamesLive } from "@/src/modules/games/live";
import { questionPrice, todayExtras } from "@/src/modules/questions/extras";
import { QuestionShop } from "@/src/modules/questions/shop";
import { questionLabel } from "@/src/modules/questions/themes";
import { BalloonCard } from "@/src/modules/questions/balloon-scene";
import { loadFlight } from "@/src/modules/questions/flight-data";
import { getRoomContext } from "@/src/modules/rooms/context";
import { QUIZ_OPEN, quizVisible } from "@/src/modules/quiz/access";

export default async function RoomHome({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  // Tout ce qui ne dépend pas de la question du jour part en même temps qu'elle (au lieu d'une requête après l'autre).
  const todo = ctx.sb
    .from("games").select("id", { count: "exact", head: true })
    .eq("room_id", roomId).eq("status", "open").neq("creator", ctx.user.id)
    .or(`target.is.null,target.eq.${ctx.user.id}`);
  const [{ data: activity }, { count }, inbox, ready, price, { data: wallet }] = await Promise.all([
    ctx.sb.rpc("today_activity", { r: roomId }).single<Activity>(),
    todo,
    isSuperAdmin(ctx.user) ? loadInbox() : [],
    SERRE_OPEN ? readyCount(roomId, ctx.user.id) : 0, // serre fermée : plus de « récoltes prêtes » (on ne peut plus les ramasser)
    questionPrice(roomId),
    adminDb().from("farm_items").select("qty").eq("room_id", roomId).eq("user_id", ctx.user.id).eq("item", "coins").maybeSingle(),
  ]);
  const [extras, flight] = await Promise.all([
    todayExtras(ctx.sb, activity),
    activity?.day ? loadFlight(ctx.sb, roomId, ctx.members.map((m) => m.user_id), activity.day) : null,
  ]);

  const tiles: { href: string; title: string; sub?: string; band: string; icon: React.ReactNode; count?: number }[] = [
    { href: `/r/${roomId}/games`, title: "Jeux", sub: count ? `${count} défi${count > 1 ? "s" : ""} t'attend${count > 1 ? "ent" : ""}` : "Défie la salle", band: "band-pink", icon: <TileIcon kind="games" />, count: count ?? 0 },
    ...(quizVisible(ctx.user) ? [{ href: `/r/${roomId}/quiz`, title: "Quiz", sub: QUIZ_OPEN ? "Géo et histoire" : "En test", band: "band-sky", icon: <TileIcon kind="quiz" /> }] : []),
    { href: `/r/${roomId}/farm`, title: SERRE_OPEN ? "Serre" : "Usine", sub: ready ? `${ready} récolte${ready > 1 ? "s" : ""} prête${ready > 1 ? "s" : ""}` : SERRE_OPEN ? "Ta serre" : "Ton usine", band: "band-leaf", icon: <TileIcon kind="farm" />, count: ready },
    { href: `/r/${roomId}/tcg`, title: "Cartes", sub: "Ta collection", band: "band-lilac", icon: <TileIcon kind="cards" /> },
  ];

  return (
    <>
      <GamesLive roomId={roomId} />
      {inbox.length > 0 && <FeedbackInbox roomId={roomId} items={inbox} />}
      {flight ? (
        <Link href={`/r/${roomId}/question`} className="sticker relative block overflow-hidden p-6 text-white">
          <BalloonCard roomId={roomId} flight={flight} people={ctx.people} names={ctx.names} question={activity?.payload.text ?? "Pas de question aujourd'hui"} />
        </Link>
      ) : (
        <Link href={`/r/${roomId}/question`} className="sticker relative block -rotate-1 overflow-hidden bg-[#FFD54A] p-5 pr-10">
          <span className="inline-block rounded-full bg-ink px-2.5 py-0.5 text-[13px] font-extrabold text-[#FFD54A]">Question du jour</span>
          <h2 className="mt-2.5 text-[1.65rem] font-bold leading-[1.12]">{activity?.payload.text ?? "Pas de question aujourd'hui"}</h2>
          <span className="mt-4 inline-block rounded-full border-2 border-ink bg-white px-4 py-1 font-display text-[1.05rem] font-bold">Répondre</span>
          {/* coin décollé */}
          <svg aria-hidden width="34" height="34" viewBox="0 0 34 34" className="absolute -right-[2.5px] -top-[2.5px]">
            <path d="M0 0H34V34Z" fill="#EEF3F4" />
            <path d="M2 0L34 32L6 28Z" fill="#fff" stroke="#2B2730" strokeWidth="2" strokeLinejoin="round" />
            <path d="M2 0L34 32L6 28Z" fill="#000" opacity=".08" />
          </svg>
        </Link>
      )}

      {extras.length > 0 && (
        <div className="space-y-3">
          {extras.map((x) => (
            <Link key={x.id} href={`/r/${roomId}/question?a=${x.id}`} className="sticker band-sun block p-4 pb-6 transition active:scale-[0.98]">
              <p className="font-display text-sm font-bold">{questionLabel(x, ctx.names)}</p>
              <p className="mt-1 font-semibold leading-snug">{x.payload.text}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3.5">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className={`sticker ${t.band} relative flex flex-col gap-2.5 p-3.5 pb-6 transition active:scale-[0.97]`}>
            {!!t.count && <span className="badge absolute -right-2 -top-2.5">{t.count}</span>}
            {t.icon}
            <span>
              <span className="block font-display text-2xl font-extrabold leading-none">{t.title}</span>
              {t.sub && <span className="mt-1 block text-[13px] font-bold">{t.sub}</span>}
            </span>
          </Link>
        ))}
      </div>

      <QuestionShop roomId={roomId} price={price} coins={wallet?.qty ?? 0} />

      <section>
        <h2 className="eyebrow mb-3">{ctx.members.length} membre{ctx.members.length > 1 ? "s" : ""}</h2>
        <div className="flex flex-wrap gap-3">
          {ctx.members.map((m) => (
            <Link
              key={m.user_id}
              href={m.user_id === ctx.user.id ? `/r/${roomId}/farm` : `/r/${roomId}/farm?u=${m.user_id}`}
              aria-label={`${SERRE_OPEN ? "Serre" : "Usine"} de ${m.username}`}
              className="flex w-14 flex-col items-center gap-1.5 text-center transition active:scale-95"
            >
              <Avatar url={m.avatar_url} character={m.character} name={m.username} size={48} />
              <span className="w-full truncate text-xs font-extrabold">{m.username}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

/** Icônes des cases de l'accueil : remplies de la couleur de leur section. */
function TileIcon({ kind }: { kind: "games" | "quiz" | "farm" | "cards" }) {
  const common = { width: 36, height: 36, viewBox: "0 0 24 24", stroke: "#2B2730", strokeWidth: 1.7, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (kind) {
    case "games":
      return <svg {...common}><rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="#FFC6D3" /><circle cx="8" cy="8" r="1.7" fill="#2B2730" stroke="none" /><circle cx="16" cy="16" r="1.7" fill="#2B2730" stroke="none" /><circle cx="12" cy="12" r="1.7" fill="#F0463C" stroke="none" /></svg>;
    case "quiz":
      return <svg {...common} fill="#BFE3F5"><circle cx="12" cy="12" r="9.5" /><path d="M7 6c2 1 1 3 3 4s1 3-1 4M16 4.8c-1 1.6 0 3 2 3.4M14 20c0-2 1.5-3 3-3.4" fill="none" /></svg>;
    case "farm":
      return <svg {...common} fill="#CDEBB5"><path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M16 6.5V3h2.5v5.3" /><rect x="9.5" y="14" width="5" height="7" fill="#93D673" /></svg>;
    case "cards":
      return <svg {...common}><rect x="4" y="2.5" width="16" height="19" rx="3" fill="#E2D6FF" /><path d="M12 7l2.6 5L12 17l-2.6-5z" fill="#9B7BFF" stroke="none" /></svg>;
  }
}
