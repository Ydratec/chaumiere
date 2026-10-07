-- Réactions emoji sur les messages du chat.

create function message_room(m bigint) returns uuid
  language sql stable security definer set search_path = public as
$$ select a.room_id from messages x join daily_activities a on a.id = x.activity_id where x.id = m $$;

create table message_reactions (
  message_id bigint references messages on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  primary key (message_id, user_id, emoji)
);

alter table message_reactions enable row level security;

create policy "lire" on message_reactions for select using (is_member(message_room(message_id)));
create policy "écrire" on message_reactions for insert
  with check (user_id = auth.uid() and is_member(message_room(message_id)));
create policy "retirer" on message_reactions for delete using (user_id = auth.uid());

alter publication supabase_realtime add table message_reactions;
