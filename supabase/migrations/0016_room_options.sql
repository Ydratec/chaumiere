-- Options de salle (réglées par les admins) :
--   vote_locked   : on ne peut plus changer son vote une fois donné ;
--   question_hour : heure de Paris (0-23) à laquelle la question du jour change.
alter table rooms
  add column vote_locked boolean not null default false,
  add column question_hour int not null default 0 check (question_hour between 0 and 23);

-- La « journée » d'une salle commence à son heure de question (ex. 18 h : la question de mardi va de mardi 18 h à mercredi 18 h).
create or replace function today_activity(r uuid) returns daily_activities
  language plpgsql security definer set search_path = public as
$$
declare
  d date := ((now() at time zone 'Europe/Paris') - make_interval(hours => (select question_hour from rooms where id = r)))::date;
  a daily_activities;
begin
  if not is_member(r) then raise exception 'not a member'; end if;
  insert into daily_activities (room_id, day, payload)
  select r, d, jsonb_build_object('qid', q.id, 'text', q.text, 'kind', q.kind)
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
