-- La serre devient une histoire en chapitres : quêtes personnelles, commandes du village, journal, secrets, activité.
-- Un chapitre vaut pour toute la salle (rooms.chapter) ; les actes sortent selon rooms.chapter_started_at.

alter table rooms
  add column chapter int not null default 1,
  add column chapter_started_at timestamptz not null default now();
-- Les salles existantes : l'histoire commence demain à minuit (heure de Paris). D'ici là, la serre garde ses règles actuelles.
update rooms set chapter_started_at = (date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day') at time zone 'Europe/Paris';

-- Quêtes terminées (par chapitre). « legacy » : les joueurs qui avaient déjà une serre gardent leurs bâtiments.
create table farm_quest_done (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  chapter int not null,
  quest text not null,
  done_at timestamptz not null default now(),
  primary key (room_id, user_id, chapter, quest)
);

-- Compteurs (récoltes cumulées du chapitre : « harvest:carrot »…).
create table farm_stats (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  count int not null default 0,
  primary key (room_id, user_id, key)
);

-- Dernier passage à la serre : sert à savoir qui est « actif » (rattrapage, taille du chantier).
create table farm_activity (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- Commandes du village : 3 par jour et par joueur.
create table farm_orders (
  id bigint generated always as identity primary key,
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  slot int not null,
  npc text not null,
  wants jsonb not null,
  reward int not null,
  done boolean not null default false,
  unique (room_id, user_id, day, slot)
);

-- Pages du journal de Mirabelle (et scènes d'événement déjà vues), gardées après chaque chapitre.
create table farm_journal (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  page text not null,
  at timestamptz not null default now(),
  primary key (room_id, user_id, page)
);

create table farm_secrets (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  secret text not null,
  found_at timestamptz not null default now(),
  primary key (room_id, user_id, secret)
);

create table farm_trophies (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  chapter int not null,
  title text not null,
  at timestamptz not null default now(),
  primary key (room_id, user_id, chapter)
);

alter table farm_quest_done enable row level security;
alter table farm_trophies enable row level security;
alter table farm_stats enable row level security;
alter table farm_activity enable row level security;
alter table farm_orders enable row level security;
alter table farm_journal enable row level security;
alter table farm_secrets enable row level security;
create policy "membres" on farm_quest_done for select using (is_member(room_id));
create policy "membres" on farm_trophies for select using (is_member(room_id));
-- (les autres tables ne se lisent que côté serveur)

-- Ceux qui avaient déjà une serre gardent poulailler et four (ils les ont déjà payés).
insert into farm_quest_done (room_id, user_id, chapter, quest)
select distinct room_id, user_id, 1, 'legacy' from farm_items
on conflict do nothing;

-- Terminer une quête (tout ou rien) : enregistre la quête, retire ce qui est livré, verse la récompense, ajoute la page de journal.
create function farm_quest_complete(r uuid, u uuid, ch int, q text, delta jsonb, pg text) returns void
  language plpgsql as
$$
begin
  insert into farm_quest_done (room_id, user_id, chapter, quest) values (r, u, ch, q); -- déjà faite : violation d'unicité
  perform farm_add_items(r, u, delta);
  insert into farm_journal (room_id, user_id, page) values (r, u, pg) on conflict do nothing;
end
$$;

-- Livrer une commande : retire les objets demandés, verse `pay` ; le dernier du jour déclenche le bonus « 3 sur 3 » (renvoyé).
create function farm_order_deliver(o bigint, u uuid, pay int) returns int
  language plpgsql as
$$
declare
  ord farm_orders;
  bonus int := 0;
begin
  update farm_orders set done = true where id = o and user_id = u and not done returning * into ord;
  if not found then raise exception 'commande déjà livrée' using errcode = 'unique_violation'; end if;
  perform farm_add_items(ord.room_id, u,
    (select coalesce(jsonb_object_agg(k, -(v::int)), '{}'::jsonb) from jsonb_each_text(ord.wants) as t(k, v)) || jsonb_build_object('coins', pay));
  if not exists (select 1 from farm_orders where room_id = ord.room_id and user_id = u and day = ord.day and not done) then
    bonus := 30;
    perform farm_add_items(ord.room_id, u, jsonb_build_object('coins', bonus));
  end if;
  return bonus;
end
$$;

create function farm_stat_add(r uuid, u uuid, k text, n int) returns void
  language sql as
$$
  insert into farm_stats (room_id, user_id, key, count) values (r, u, k, n)
  on conflict (room_id, user_id, key) do update set count = farm_stats.count + excluded.count
$$;

revoke execute on function farm_quest_complete(uuid, uuid, int, text, jsonb, text) from public, anon, authenticated;
revoke execute on function farm_order_deliver(bigint, uuid, int) from public, anon, authenticated;
revoke execute on function farm_stat_add(uuid, uuid, text, int) from public, anon, authenticated;
