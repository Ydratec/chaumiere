-- Quiz en ligne : tchat du salon d'attente et revanche.
-- chat    : derniers messages du salon [{ u, t, at }] (60 au plus).
-- rematch : joueurs qui veulent la revanche ; next : la partie de revanche, créée quand tous les joueurs
--           encore là l'ont demandée (en direct, ou chacun son tour si la partie l'était).

alter table quiz_matches add column chat jsonb not null default '[]';
alter table quiz_matches add column rematch jsonb not null default '[]';
alter table quiz_matches add column next uuid references quiz_matches on delete set null;

create function quiz_say(m uuid, u uuid, t text) returns void language sql set search_path = public as $$
  update quiz_matches set chat = (
    select coalesce(jsonb_agg(x order by n), '[]') from (
      select x, n from jsonb_array_elements(chat || jsonb_build_array(jsonb_build_object('u', u, 't', t, 'at', now()))) with ordinality as e(x, n)
      order by n desc limit 60
    ) last
  ) where id = m;
$$;

create function quiz_rematch(m uuid, u uuid) returns uuid language plpgsql set search_path = public as $$
declare mt quiz_matches; voters jsonb; need int; nid uuid; other uuid;
begin
  select * into mt from quiz_matches where id = m for update;
  if not found then return null; end if;
  if mt.next is not null then return mt.next; end if;
  if not exists (select 1 from quiz_match_players where match_id = m and user_id = u) then return null; end if;
  voters := mt.rematch;
  if not voters ? u::text then
    voters := voters || to_jsonb(u::text);
    update quiz_matches set rematch = voters where id = m;
  end if;
  select count(*) into need from quiz_match_players where match_id = m and not left_game;
  if need < 2 or jsonb_array_length(voters) < need then return null; end if;
  select user_id into other from quiz_match_players where match_id = m and user_id <> u limit 1;
  insert into quiz_matches (room_id, host, mode, rules, game, level, cat, seed, n, status, start_at, target, async)
    values (mt.room_id, u, mt.mode, mt.rules, mt.game, mt.level, mt.cat, floor(random() * 2147483647)::int, mt.n, 'playing',
      case when mt.async then null else now() + interval '4 seconds' end,
      case when mt.target is not null then other end, mt.async)
    returning id into nid;
  insert into quiz_match_players (match_id, room_id, user_id)
    select nid, mt.room_id, v::uuid from jsonb_array_elements_text(voters) v;
  update quiz_matches set next = nid where id = m;
  return nid;
end $$;

revoke all on function quiz_say(uuid, uuid, text) from public, anon, authenticated;
revoke all on function quiz_rematch(uuid, uuid) from public, anon, authenticated;
grant execute on function quiz_say(uuid, uuid, text) to service_role;
grant execute on function quiz_rematch(uuid, uuid) to service_role;
