import { cache } from "react";
import { db } from "@/src/lib/db/server";
import { readCharacter, type Character } from "@/src/modules/characters/catalog";

export type Member = { user_id: string; username: string; role: "admin" | "member"; avatar_url: string | null; character: Character };
/** Ce qu'il faut pour afficher quelqu'un : pseudo, photo, personnage. */
export type Person = { name: string; url: string | null; character: Character };

/** Utilisateur connecté + une de ses salles + ses membres, ou null si pas connecté / pas membre. */
export const getRoomContext = cache(async (roomId: string) => {
  const sb = await db();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: me } = await sb
    .from("room_members")
    .select("role, rooms(name, avatar_url)")
    .eq("user_id", user.id)
    .eq("room_id", roomId)
    .maybeSingle<{ role: Member["role"]; rooms: { name: string; avatar_url: string | null } }>();
  if (!me) return null;

  const { data } = await sb
    .from("room_members")
    .select("user_id, username, role, avatar_url, character")
    .eq("room_id", roomId)
    .order("username");
  const members: Member[] = (data ?? []).map((m) => ({ ...m, character: readCharacter(m.character, m.username) }));
  const names: Record<string, string> = Object.fromEntries(members.map((m) => [m.user_id, m.username]));
  const people: Record<string, Person> = Object.fromEntries(
    members.map((m) => [m.user_id, { name: m.username, url: m.avatar_url, character: m.character }]),
  );
  return {
    sb,
    user,
    roomId,
    roomName: me.rooms?.name,
    roomAvatar: me.rooms?.avatar_url ?? null,
    isAdmin: me.role === "admin",
    members,
    names,
    people,
  };
});

/** Les salles de l'utilisateur connecté (null si pas connecté). */
export async function getMyRooms() {
  const sb = await db();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("room_members")
    .select("room_id, username, rooms(name, avatar_url)")
    .eq("user_id", user.id)
    .returns<{ room_id: string; username: string; rooms: { name: string; avatar_url: string | null } }[]>();
  return data ?? [];
}
