-- Discussion dans une partie : les joueurs (et les spectateurs de la salle) peuvent s'écrire pendant le jeu.
create function game_room(g uuid) returns uuid
  language sql stable security definer set search_path = public as
$$ select room_id from games where id = g $$;

create table game_messages (
  id bigint generated always as identity primary key,
  game_id uuid not null references games on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index on game_messages (game_id, id);

alter table game_messages enable row level security;
create policy "lire" on game_messages for select using (is_member(game_room(game_id)));
create policy "écrire" on game_messages for insert
  with check (user_id = auth.uid() and is_member(game_room(game_id)));

alter publication supabase_realtime add table game_messages;
