import { cache } from "react";
import { db } from "@/src/lib/db/server";
import { readCharacter, type Character } from "@/src/modules/characters/catalog";
import { chapterDay } from "@/src/modules/farm/story/state";

export type Member = { user_id: string; username: string; role: "admin" | "member"; avatar_url: string | null; character: Character };
/** Ce qu'il faut pour afficher quelqu'un : pseudo, photo, personnage. */
export type Person = { name: string; url: string | null; character: Character };

export type AuthUser = { id: string; email?: string };

/**
 * Utilisateur connecté, vérifié localement (signature ES256 du jeton, sans appel réseau à Supabase Auth).
 * Mis en cache pour la durée d'une requête.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const { data } = await (await db()).auth.getClaims();
  const c = data?.claims;
  return c?.sub ? { id: c.sub, email: typeof c.email === "string" ? c.email : undefined } : null;
});

/** Utilisateur connecté + une de ses salles + ses membres, ou null si pas connecté / pas membre. */
export const getRoomContext = cache(async (roomId: string) => {
  const user = await getAuthUser();
  if (!user) return null;
  const sb = await db();

  // Une seule requête : tous les membres (la RLS ne renvoie rien si on n'est pas membre) + la salle.
  const { data } = await sb
    .from("room_members")
    .select("user_id, username, role, avatar_url, character, rooms(name, avatar_url, vote_locked, question_hour, chapter, chapter_started_at)")
    .eq("room_id", roomId)
    .order("username")
    .returns<(Omit<Member, "character"> & { character: unknown; rooms: { name: string; avatar_url: string | null; vote_locked: boolean; question_hour: number; chapter: number; chapter_started_at: string } })[]>();
  const me = data?.find((m) => m.user_id === user.id);
  if (!me) return null;

  const members: Member[] = data!.map((m) => ({
    user_id: m.user_id, username: m.username, role: m.role, avatar_url: m.avatar_url, character: readCharacter(m.character, m.username),
  }));
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
    voteLocked: !!me.rooms?.vote_locked,
    questionHour: me.rooms?.question_hour ?? 0,
    chapter: me.rooms?.chapter ?? 1,
    storyDay: me.rooms ? chapterDay(me.rooms.chapter_started_at, Date.now()) : 1, // 0 ou moins : l'histoire de la serre n'a pas commencé
    isAdmin: me.role === "admin",
    members,
    names,
    people,
  };
});

/** Les salles de l'utilisateur connecté (null si pas connecté). */
export async function getMyRooms() {
  const user = await getAuthUser();
  if (!user) return null;
  const { data } = await (await db())
    .from("room_members")
    .select("room_id, username, rooms(name, avatar_url)")
    .eq("user_id", user.id)
    .returns<{ room_id: string; username: string; rooms: { name: string; avatar_url: string | null } }[]>();
  return data ?? [];
}
