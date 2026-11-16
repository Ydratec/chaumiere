-- Optimisations sans effet visible. Peut être lancée avant ou après la mise en ligne du code (rien n'en dépend).

-- 1. Question du jour : la fonction est appelée à chaque page (accueil, question, pastilles, cartes). Jusqu'ici elle
--    retentait à chaque fois un tirage au sort parmi toutes les questions et une insertion (refusée dès que la question
--    du jour existait). Maintenant : on lit d'abord ; le tirage n'a lieu qu'une fois par jour, s'il n'y a rien encore.
--    Le tirage lui-même est inchangé (migration 0029).
create or replace function today_activity(r uuid) returns daily_activities
  language plpgsql security definer set search_path = public as
$$
declare
  d date := ((now() at time zone 'Europe/Paris') - make_interval(hours => (select question_hour from rooms where id = r)))::date;
  n int;
  a daily_activities;
begin
  if not is_member(r) then raise exception 'not a member'; end if;
  select * into a from daily_activities where room_id = r and day = d and type = 'question' and slot = 0;
  if found then return a; end if;

  n := (select count(*) from room_members where room_id = r);
  insert into daily_activities (room_id, day, payload)
  select r, d, question_payload(r, q)
  from questions q
  where (q.pack = 'base' or exists (select 1 from room_unlocks u where u.room_id = r and u.key = 'pack:' || q.pack)) and question_fits(q, n)
  order by exists (
    select 1 from daily_activities x
    where x.room_id = r and (x.payload->>'qid')::int = q.id
  ), random()
  limit 1
  on conflict do nothing;
  select * into a from daily_activities where room_id = r and day = d and type = 'question' and slot = 0;
  return a;
end
$$;

-- 2. Index sur les recherches les plus fréquentes (sans effet à quelques joueurs, utile quand les tables grossissent).
create index if not exists messages_activity_idx on messages (activity_id, id);           -- discussion d'une question
create index if not exists games_room_status_idx on games (room_id, status);              -- défis et parties en cours d'une salle
create index if not exists room_members_user_idx on room_members (user_id);               -- « mes salles »
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);   -- appareils d'une personne
