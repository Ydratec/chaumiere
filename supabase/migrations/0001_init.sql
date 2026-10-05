-- Chaumière : salons, question du jour, réponses, chat.
-- À exécuter une fois dans Supabase (SQL editor ou `supabase db push`).

create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null
);

create table room_members (
  room_id uuid references rooms on delete cascade,
  user_id uuid references auth.users on delete cascade,
  username text not null,
  primary key (room_id, user_id),
  unique (room_id, username)
);

create table questions (
  id serial primary key,
  text text unique not null
);

-- Une « activité » par salon et par jour. `type` est le point d'extension
-- (question, puis sondage, jeu…) ; `payload` contient ce dont le type a besoin.
create table daily_activities (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms on delete cascade,
  day date not null,
  type text not null default 'question',
  payload jsonb not null,
  unique (room_id, day, type)
);

create table answers (
  activity_id uuid references daily_activities on delete cascade,
  user_id uuid default auth.uid() references auth.users on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  primary key (activity_id, user_id)
);

create table messages (
  id bigint generated always as identity primary key,
  activity_id uuid not null references daily_activities on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- Helpers security definer : évitent la récursion RLS.
create function is_member(r uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from room_members where room_id = r and user_id = auth.uid()) $$;

create function activity_room(a uuid) returns uuid
  language sql stable security definer set search_path = public as
$$ select room_id from daily_activities where id = a $$;

create function has_answered(a uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from answers where activity_id = a and user_id = auth.uid()) $$;

-- Crée (de façon atomique) la question du jour du salon si besoin et la renvoie.
-- Privilégie les questions pas encore posées dans ce salon.
create function today_activity(r uuid) returns daily_activities
  language plpgsql security definer set search_path = public as
$$
declare
  d date := (now() at time zone 'Europe/Paris')::date;
  a daily_activities;
begin
  if not is_member(r) then raise exception 'not a member'; end if;
  insert into daily_activities (room_id, day, payload)
  select r, d, jsonb_build_object('qid', q.id, 'text', q.text)
  from questions q
  order by exists (
    select 1 from daily_activities x
    where x.room_id = r and (x.payload->>'qid')::int = q.id
  ), random()
  limit 1
  on conflict do nothing;
  select * into a from daily_activities where room_id = r and day = d and type = 'question';
  return a;
end
$$;

alter table rooms enable row level security;
alter table room_members enable row level security;
alter table questions enable row level security;
alter table daily_activities enable row level security;
alter table answers enable row level security;
alter table messages enable row level security;

create policy "membres" on rooms for select using (is_member(id));
create policy "membres" on room_members for select using (is_member(room_id));
create policy "membres" on daily_activities for select using (is_member(room_id));

-- On ne voit les réponses des autres qu'après avoir répondu.
create policy "lire" on answers for select
  using (is_member(activity_room(activity_id)) and (user_id = auth.uid() or has_answered(activity_id)));
create policy "écrire" on answers for insert
  with check (user_id = auth.uid() and is_member(activity_room(activity_id)));
create policy "modifier" on answers for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "lire" on messages for select using (is_member(activity_room(activity_id)));
create policy "écrire" on messages for insert
  with check (user_id = auth.uid() and is_member(activity_room(activity_id)));

alter publication supabase_realtime add table messages;

-- Premier salon (change le code !) :
-- insert into rooms (name, code) values ('Les amis du vendredi', 'vendredi');
