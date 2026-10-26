import { redirect } from "next/navigation";
import { Avatar } from "@/src/components/avatar";
import { AvatarForm } from "@/src/modules/rooms/avatar-form";
import { deleteRoom, kick, renameRoom, setRole } from "@/src/modules/rooms/actions";
import { CodeForm } from "@/src/modules/rooms/code-form";
import { RoomOptions } from "@/src/modules/rooms/options-form";
import { getRoomContext } from "@/src/modules/rooms/context";
import { CharacterSprite } from "@/src/components/character-sprite";
import { adminDb } from "@/src/lib/db/server";
import { giveUnique } from "@/src/modules/characters/actions";
import { SPECIES, UNIQUE_SPECIES, skinKey } from "@/src/modules/characters/catalog";

const btn = "btn-soft px-3 py-1.5 text-xs";

export default async function ManagePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ctx = await getRoomContext(roomId);
  if (!ctx) redirect("/");
  const { data: room } = ctx.isAdmin
    ? await ctx.sb.from("rooms").select("code").eq("id", roomId).single()
    : { data: null };
  const rid = <input type="hidden" name="room_id" value={roomId} />;
  // Personnages uniques : qui a quoi (un seul exemplaire par salle)
  const { data: skins } = ctx.isAdmin
    ? await adminDb().from("farm_items").select("user_id, item").eq("room_id", roomId).like("item", "skin:species:%").gt("qty", 0)
    : { data: [] };
  const ownerOf = (s: string) => (skins ?? []).find((k) => k.item === skinKey("species", s))?.user_id ?? "";

  return (
    <>
      {ctx.isAdmin && (
        <section className="space-y-5">
          <div className="flex flex-col items-center gap-3 pt-4">
            <Avatar url={ctx.roomAvatar} name={ctx.roomName ?? "?"} size={96} />
            <AvatarForm roomId={roomId} target="room" />
          </div>
          <form action={renameRoom} className="space-y-2">
            {rid}
            <label className="eyebrow" htmlFor="room-name">Nom de la salle</label>
            <div className="flex gap-2">
              <input id="room-name" name="name" defaultValue={ctx.roomName} maxLength={60} required className="field min-w-0 flex-1 bg-white shadow-sm" />
              <button className="btn px-4">Renommer</button>
            </div>
          </form>
          <div className="space-y-2">
            <p className="eyebrow">Code d&apos;invitation</p>
            <CodeForm roomId={roomId} code={room?.code ?? ""} />
          </div>
          <div>
            <p className="eyebrow">Question du jour</p>
            <RoomOptions roomId={roomId} voteLocked={ctx.voteLocked} questionHour={ctx.questionHour} />
          </div>
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-1">Membres · {ctx.members.length}</h2>
        <ul className="rows">
          {ctx.members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 py-3">
              <Avatar url={m.avatar_url} character={m.character} name={m.username} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {m.username}
                {m.role === "admin" && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">admin</span>}
              </span>
              {ctx.isAdmin && (
                <>
                  <form action={setRole}>
                    {rid}
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <input type="hidden" name="role" value={m.role === "admin" ? "member" : "admin"} />
                    <button className={btn}>{m.role === "admin" ? "Retirer admin" : "Admin"}</button>
                  </form>
                  {m.user_id !== ctx.user.id && (
                    <form action={kick}>
                      {rid}
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <button className={`${btn} text-red-600`}>Exclure</button>
                    </form>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {ctx.isAdmin && (
        <section className="space-y-3">
          <div>
            <h2 className="eyebrow">Personnages uniques</h2>
            <p className="mt-1 text-sm text-zinc-500">Un seul exemplaire par salle : donne-le à quelqu&apos;un, il le porte tout de suite (et l&apos;ancien propriétaire le perd).</p>
          </div>
          <ul className="rows">
            {UNIQUE_SPECIES.map((s) => (
              <li key={s}>
                <form action={giveUnique} className="flex items-center gap-3 py-2.5">
                  {rid}
                  <input type="hidden" name="species" value={s} />
                  <span className="flex size-14 shrink-0 items-end justify-center rounded-2xl bg-[#efd9ba] pb-1">
                    <CharacterSprite character={{ species: s, color: 0, accessory: null }} size={50} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{SPECIES[s].name}</span>
                    <select name="user_id" defaultValue={ownerOf(s)} className="field mt-1 w-full py-1.5 text-sm">
                      <option value="">Personne</option>
                      {ctx.members.map((m) => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
                    </select>
                  </span>
                  <button className={btn}>Donner</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ctx.isAdmin && (
        <form action={deleteRoom} className="space-y-3">
          {rid}
          <h2 className="eyebrow text-red-600">Zone dangereuse</h2>
          <p className="text-sm text-zinc-600">Supprime la salle, ses messages et ses réponses. Irréversible.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" required className="accent-red-600" /> Je confirme la suppression
          </label>
          <button className="btn bg-red-600 hover:bg-red-700">Supprimer la salle</button>
        </form>
      )}
    </>
  );
}
