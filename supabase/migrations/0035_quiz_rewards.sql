-- Quiz : pièces gagnées en jouant (les mêmes pièces que le reste de Chaumière, dans farm_items).
-- Un journal des gains, une ligne par partie récompensée (même à 0 : elle compte pour les gains décroissants),
-- et une fonction qui applique les règles et crédite les pièces d'un seul geste, verrouillée par joueur.
-- Les montants de base sont calculés par le serveur (src/modules/quiz/rewards.ts) ; ici, les limites :
--   défi du jour : une seule fois par jour ;
--   parties solo : gains décroissants par jeu dans la journée (100 %, 50 %, 25 %, puis rien) ;
--   parties en ligne : 5 récompensées par jour, 2 contre le même adversaire, une fois par partie ;
--   plafond : 2 000 pièces par jour hors défi du jour (jour de Paris).
-- Seul le serveur écrit ; chacun peut lire ses propres gains.

create table quiz_rewards (
  id bigint generated always as identity primary key,
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  day date not null,                -- jour de Paris
  kind text not null check (kind in ('daily', 'solo', 'online')),
  game text not null default '',    -- jeu (solo), 'daily', ou le jeu de la partie en ligne
  match_id uuid references quiz_matches on delete set null,
  opponent uuid,                    -- duel en ligne : l'adversaire
  amount int not null check (amount >= 0),
  created_at timestamptz not null default now()
);
create unique index quiz_rewards_one_daily on quiz_rewards (room_id, user_id, day) where kind = 'daily';
create unique index quiz_rewards_one_match on quiz_rewards (match_id, user_id) where match_id is not null;
create index quiz_rewards_user_day on quiz_rewards (room_id, user_id, day);
alter table quiz_rewards enable row level security;
create policy "ses gains" on quiz_rewards for select using (user_id = auth.uid());

create function quiz_grant(r uuid, u uuid, d date, k text, g text, base int, m uuid default null, opp uuid default null)
returns int language plpgsql set search_path = public as $$
declare earned int; n int; amt int;
begin
  perform pg_advisory_xact_lock(hashtextextended(r::text || u::text, 0));
  if base < 0 then base := 0; end if;
  if k = 'daily' then
    if exists (select 1 from quiz_rewards where room_id = r and user_id = u and day = d and kind = 'daily') then return 0; end if;
    amt := base;
  else
    select coalesce(sum(amount), 0) into earned from quiz_rewards where room_id = r and user_id = u and day = d and kind <> 'daily';
    if k = 'solo' then
      select count(*) into n from quiz_rewards where room_id = r and user_id = u and day = d and kind = 'solo' and game = g;
      amt := floor(base * (case n when 0 then 1 when 1 then 0.5 when 2 then 0.25 else 0 end));
    elsif k = 'online' then
      if m is not null and exists (select 1 from quiz_rewards where match_id = m and user_id = u) then return 0; end if;
      select count(*) into n from quiz_rewards where room_id = r and user_id = u and day = d and kind = 'online';
      amt := case when n >= 5 then 0 else base end;
      if opp is not null and (select count(*) from quiz_rewards where room_id = r and user_id = u and day = d and kind = 'online' and opponent = opp) >= 2 then amt := 0; end if;
    else
      raise exception 'type de gain inconnu : %', k;
    end if;
    amt := greatest(0, least(amt, 2000 - earned)); -- plafond du jour : REWARDS.dayCap
  end if;
  insert into quiz_rewards (room_id, user_id, day, kind, game, match_id, opponent, amount) values (r, u, d, k, g, m, opp, amt);
  if amt > 0 then perform farm_add_items(r, u, jsonb_build_object('coins', amt)); end if;
  return amt;
end $$;

revoke all on function quiz_grant(uuid, uuid, date, text, text, int, uuid, uuid) from public, anon, authenticated;
grant execute on function quiz_grant(uuid, uuid, date, text, text, int, uuid, uuid) to service_role;
