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
import { loadStreak } from "@/src/modules/questions/streak";
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
  const [extras, streak] = await Promise.all([
    todayExtras(ctx.sb, activity),
    activity?.day ? loadStreak(ctx.sb, roomId, ctx.members.map((m) => m.user_id), activity.day) : null,
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
      <Link href={`/r/${roomId}/question`} className="relative block -rotate-1 rounded-md bg-[#FFD54A] p-5 pr-10 shadow-[0_14px_22px_-14px_rgb(43_39_48/0.55),0_2px_3px_rgb(43_39_48/0.12)]">
        <span className="inline-block rounded-full bg-ink px-2.5 py-0.5 text-[13px] font-extrabold text-[#FFD54A]">Question du jour</span>
        <h2 className="mt-2.5 text-[1.65rem] font-bold leading-[1.12]">{activity?.payload.text ?? "Pas de question aujourd'hui"}</h2>
        <span className="mt-4 flex items-center justify-between gap-3">
          {streak && <span className="text-sm font-extrabold">{streak.answered} sur {streak.total} ont répondu</span>}
          <span className="rounded-full border-2 border-ink bg-white px-4 py-1 font-display text-[1.05rem] font-bold">Répondre</span>
        </span>
        {/* coin du post-it qui se décolle */}
        <svg aria-hidden width="30" height="30" viewBox="0 0 30 30" className="absolute right-0 top-0">
          <path d="M0 0H30V30Z" fill="#EEF3F4" />
          <path d="M0 0L30 30L4 26Z" fill="#F2C53A" />
          <path d="M0 0L30 30L4 26Z" fill="#000" opacity=".06" />
        </svg>
        {streak && <Flame days={streak.days} lit={streak.today} />}
      </Link>

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

/**
 * Flamme de la salle (autocollant rond sur la question du jour) : jours d'affilée où tout le monde a répondu.
 * Vive quand la série inclut aujourd'hui, plus pâle tant qu'il manque des réponses du jour, grise à zéro.
 */
function Flame({ days, lit }: { days: number; lit: boolean }) {
  const [outer, inner] = !days ? ["#D5D2DA", "#F1EFF4"] : lit ? ["#FF7A2F", "#FFD54A"] : ["#FFB07A", "#FFE8A6"];
  return (
    <span
      aria-label={days ? `${days} jour${days > 1 ? "s" : ""} d'affilée où tout le monde a répondu` : "Aucune série en cours"}
      className="sticker absolute -bottom-4 -right-3 flex rotate-6 items-center gap-0.5 rounded-full py-0.5 pl-1.5 pr-2.5"
    >
      <svg width="24" height="28" viewBox="0 0 24 28" aria-hidden>
        <path d="M12 1.5c1 4.5 6.5 7 7.8 12.6C21 19.6 17.5 26 12 26S3 21.8 3 17c0-3.2 1.6-5.6 3.6-7.2.2 2.4 1.2 4 2.8 4.6C8.4 9.6 9.6 4.6 12 1.5z" fill={outer} stroke="#2B2730" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 13c.6 2.6 4 3.6 4 7.2 0 2.4-1.8 3.8-4 3.8s-4-1.4-4-3.6c0-2.8 2.6-4.2 4-7.4z" fill={inner} />
      </svg>
      <span className="font-display text-xl font-extrabold leading-none">{days}</span>
    </span>
  );
}
