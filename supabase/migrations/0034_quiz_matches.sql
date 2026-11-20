-- Géo Quiz en ligne : parties à plusieurs (duel, partie aux points, partie à élimination).
-- Le serveur écrit (app/api/quiz/[roomId]/match) ; les membres de la salle lisent, et suivent en temps réel
-- (le jeu est prévenu par la page Quiz, qui écoute ces deux tables).

create table quiz_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms on delete cascade,
  host uuid not null references auth.users on delete cascade,
  mode text not null,                  -- duel | party
  rules text not null default 'points',-- points | elim
  game text not null,                  -- identifiant du jeu (geo, flag…)
  level text not null,                 -- facile | expert
  cat text not null default '',
  seed int not null,                   -- graine : les mêmes questions chez tous les joueurs
  n int not null,                      -- nombre de questions (plafond pour l'élimination)
  status text not null default 'lobby',-- lobby | playing | done | cancelled
  start_at timestamptz,                -- début de la première question (après le décompte)
  ends jsonb not null default '{}',    -- { "<question>": moment où tous les joueurs en lice avaient répondu }
  created_at timestamptz not null default now()
);
create index quiz_matches_room on quiz_matches (room_id, status, created_at);

create table quiz_match_players (
  match_id uuid not null references quiz_matches on delete cascade,
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  answers jsonb not null default '[]', -- [{ i, good, pts, pick, pt }]
  score int not null default 0,
  left_game boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table quiz_matches enable row level security;
alter table quiz_match_players enable row level security;
create policy "membres" on quiz_matches for select using (is_member(room_id));
create policy "membres" on quiz_match_players for select using (is_member(room_id));

alter publication supabase_realtime add table quiz_matches;
alter publication supabase_realtime add table quiz_match_players;

-- Opérations atomiques (appelées seulement par le serveur, avec la clé serveur).

-- Rejoindre : refuse si la partie a commencé ou est complète ; un duel démarre dès que le 2e joueur arrive.
create function quiz_join(m uuid, u uuid) returns text language plpgsql as $$
declare mt quiz_matches; c int;
begin
  select * into mt from quiz_matches where id = m for update;
  if not found then return 'introuvable'; end if;
  if exists (select 1 from quiz_match_players where match_id = m and user_id = u) then return 'ok'; end if;
  if mt.status <> 'lobby' then return 'commencee'; end if;
  select count(*) into c from quiz_match_players where match_id = m;
  if (mt.mode = 'duel' and c >= 2) or c >= 12 then return 'complete'; end if;
  insert into quiz_match_players (match_id, room_id, user_id) values (m, mt.room_id, u);
  if mt.mode = 'duel' and c + 1 = 2 then
    update quiz_matches set status = 'playing', start_at = now() + interval '4 seconds' where id = m;
  end if;
  return 'ok';
end $$;

-- Répondre : une seule réponse par question et par joueur ; le score suit.
create function quiz_answer(m uuid, u uuid, a jsonb) returns boolean language plpgsql as $$
begin
  update quiz_match_players
    set answers = answers || jsonb_build_array(a), score = score + coalesce((a->>'pts')::int, 0)
    where match_id = m and user_id = u
      and not exists (select 1 from jsonb_array_elements(answers) e where (e->>'i')::int = (a->>'i')::int);
  return found;
end $$;

-- Fin anticipée d'une question (tous les joueurs en lice ont répondu) : notée une seule fois.
create function quiz_mark_end(m uuid, i int) returns void language sql as $$
  update quiz_matches set ends = ends || jsonb_build_object(i::text, now())
  where id = m and not (ends ? i::text);
$$;

revoke all on function quiz_join(uuid, uuid) from public, anon, authenticated;
revoke all on function quiz_answer(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function quiz_mark_end(uuid, int) from public, anon, authenticated;
grant execute on function quiz_join(uuid, uuid) to service_role;
grant execute on function quiz_answer(uuid, uuid, jsonb) to service_role;
grant execute on function quiz_mark_end(uuid, int) to service_role;
