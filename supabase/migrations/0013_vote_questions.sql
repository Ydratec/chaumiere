-- Questions de vote : on choisit un membre de la salle (la réponse enregistrée est son id).
alter table questions add column kind text not null default 'open' check (kind in ('open', 'vote'));

-- La question du jour emporte son type (payload.kind) ; le reste est inchangé (packs débloqués compris).
create or replace function today_activity(r uuid) returns daily_activities
  language plpgsql security definer set search_path = public as
$$
declare
  d date := (now() at time zone 'Europe/Paris')::date;
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

insert into questions (text, kind) values
  ('Qui serait le plus susceptible de devenir célèbre ?', 'vote'),
  ('Qui survivrait le plus longtemps sur une île déserte ?', 'vote'),
  ('Qui est le plus susceptible d''arriver en retard à son propre mariage ?', 'vote'),
  ('Qui ferait le meilleur président ?', 'vote'),
  ('Qui rit le plus fort ?', 'vote'),
  ('Qui organiserait la meilleure soirée ?', 'vote'),
  ('Qui est le plus susceptible de partir vivre à l''étranger ?', 'vote'),
  ('Qui cuisine le mieux ?', 'vote'),
  ('Qui a le plus de chances de gagner à un jeu télévisé ?', 'vote'),
  ('Qui oublierait le plus vite un anniversaire ?', 'vote'),
  ('Qui serait le meilleur détective ?', 'vote'),
  ('Qui adopterait le plus d''animaux ?', 'vote'),
  ('Qui est le plus susceptible de pleurer devant un film ?', 'vote'),
  ('Qui gagnerait un concours de danse ?', 'vote'),
  ('Qui dépenserait tout son salaire en un week-end ?', 'vote'),
  ('Qui serait le premier à survivre à une invasion de zombies ?', 'vote'),
  ('Qui donne les meilleurs conseils ?', 'vote'),
  ('Qui a le meilleur sens de l''orientation ?', 'vote'),
  ('Qui pourrait écrire un roman ?', 'vote'),
  ('Qui est le plus susceptible de devenir millionnaire ?', 'vote')
on conflict (text) do nothing;
