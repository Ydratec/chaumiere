-- Quiz en ligne : défier une personne en particulier.
-- target : la seule personne (avec le créateur) qui peut rejoindre la partie ; elle seule est prévenue.
-- async  : le créateur n'a pas attendu (« jouer sans attendre ») : chacun joue les mêmes questions de son côté,
--          à son rythme ; le face-à-face s'affiche quand les deux ont fini.
-- done_at (joueur) : fin de sa partie, en mode chacun son tour (la partie est finie quand les deux ont fini).

alter table quiz_matches add column target uuid references auth.users on delete cascade;
alter table quiz_matches add column async boolean not null default false;
alter table quiz_match_players add column done_at timestamptz;
create index quiz_matches_target on quiz_matches (target, status) where target is not null;

-- Rejoindre : une partie ciblée n'accepte que le créateur et la personne défiée ; en mode chacun son tour, la
-- personne défiée peut rejoindre une partie déjà lancée. Un duel en direct démarre dès que le 2e joueur arrive.
create or replace function quiz_join(m uuid, u uuid) returns text language plpgsql set search_path = public as $$
declare mt quiz_matches; c int;
begin
  select * into mt from quiz_matches where id = m for update;
  if not found then return 'introuvable'; end if;
  if exists (select 1 from quiz_match_players where match_id = m and user_id = u) then return 'ok'; end if;
  if mt.target is not null and u <> mt.host and u <> mt.target then return 'privee'; end if;
  if mt.status = 'cancelled' then return 'introuvable'; end if;
  if mt.status <> 'lobby' and not (mt.async and u = mt.target) then return 'commencee'; end if;
  select count(*) into c from quiz_match_players where match_id = m;
  if (mt.mode = 'duel' and c >= 2) or c >= 12 then return 'complete'; end if;
  insert into quiz_match_players (match_id, room_id, user_id) values (m, mt.room_id, u);
  if mt.mode = 'duel' and c + 1 = 2 and not mt.async then
    update quiz_matches set status = 'playing', start_at = now() + interval '4 seconds' where id = m;
  end if;
  return 'ok';
end $$;

revoke all on function quiz_join(uuid, uuid) from public, anon, authenticated;
grant execute on function quiz_join(uuid, uuid) to service_role;
