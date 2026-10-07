-- Projets de salle (ferme) et déblocages : jeux, packs de questions, cosmétiques, améliorations.

create table room_unlocks (
  room_id uuid not null references rooms on delete cascade,
  key text not null,           -- ex. game:battleship, pack:voyages, upgrade:land
  unlocked_at timestamptz not null default now(),
  primary key (room_id, key)
);

-- On ne fait qu'ajouter des lignes : la progression d'un projet est la somme (pas de conflit d'écriture).
create table farm_contributions (
  id bigint generated always as identity primary key,
  room_id uuid not null references rooms on delete cascade,
  project text not null,
  user_id uuid not null references auth.users on delete cascade,
  item text not null,
  qty int not null check (qty > 0),
  at timestamptz not null default now()
);

alter table room_unlocks enable row level security;
alter table farm_contributions enable row level security;
create policy "membres" on room_unlocks for select using (is_member(room_id));
create policy "membres" on farm_contributions for select using (is_member(room_id));
alter publication supabase_realtime add table farm_contributions, room_unlocks;

-- Retire les objets du joueur et enregistre le don, dans une seule transaction.
create function farm_contribute(r uuid, u uuid, p text, it text, n int) returns void
  language plpgsql as
$$
begin
  perform farm_add_items(r, u, jsonb_build_object(it, -n));
  insert into farm_contributions (room_id, project, user_id, item, qty) values (r, p, u, it, n);
end
$$;
revoke execute on function farm_contribute(uuid, uuid, text, text, int) from public, anon, authenticated;

-- Packs de questions : « base » est toujours disponible, les autres se débloquent à la ferme.
alter table questions add column pack text not null default 'base';

create or replace function today_activity(r uuid) returns daily_activities
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
  where q.pack = 'base' or exists (select 1 from room_unlocks u where u.room_id = r and u.key = 'pack:' || q.pack)
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
