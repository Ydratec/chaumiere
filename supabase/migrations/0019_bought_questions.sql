-- Questions achetées avec les pièces de la serre : elles s'ajoutent à la question du jour (même journée, leur propre discussion).
-- Prix par salle : 1 000 pièces, il double à chaque achat (« chaleur » +1) puis redescend un peu chaque jour (chaleur -0,35/jour).
-- Un pack à thème ajoute d'un coup 3 questions d'un pack « theme:… » (jamais tirées pour la question du jour) et coûte 5 fois le prix.

alter table rooms
  add column question_heat real not null default 0,
  add column question_heat_at timestamptz not null default now();

-- Plusieurs questions le même jour : slot 0 = question du jour, 1, 2… = achetées.
alter table daily_activities
  add column slot int not null default 0,
  add column bought_by uuid references auth.users on delete set null;
alter table daily_activities drop constraint daily_activities_room_id_day_type_key;
alter table daily_activities add unique (room_id, day, type, slot);

-- La question du jour reste le slot 0.
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
  select * into a from daily_activities where room_id = r and day = d and type = 'question' and slot = 0;
  return a;
end
$$;

-- Prix actuel d'une question en plus (un pack à thème coûte 5 fois ce prix). Arrondi à 50.
create function question_price(r uuid) returns int
  language sql stable as
$$
  select (ceil(1000 * power(2, greatest(0, question_heat - 0.35 * extract(epoch from now() - question_heat_at) / 86400)) / 50) * 50)::int
  from rooms where id = r
$$;

-- Achat (tout ou rien) : paie, tire des questions pas encore posées si possible (1, ou 3 pour un pack à thème),
-- les ajoute à la journée, fait monter le prix. Renvoie la première.
create function buy_question(r uuid, u uuid, theme text) returns daily_activities
  language plpgsql as
$$
declare
  d date;
  h real;
  price int;
  q questions;
  a daily_activities;
  first daily_activities;
  n int := 0;
begin
  -- Verrou sur la salle : deux achats simultanés paient bien deux prix différents.
  select ((now() at time zone 'Europe/Paris') - make_interval(hours => question_hour))::date,
         greatest(0, question_heat - 0.35 * extract(epoch from now() - question_heat_at) / 86400)
    into d, h from rooms where id = r for update;
  price := question_price(r) * (case when theme is null then 1 else 5 end);
  perform farm_add_items(r, u, jsonb_build_object('coins', -price));

  for q in
    select * from questions x
    where case when theme is null
      then x.pack = 'base' or exists (select 1 from room_unlocks k where k.room_id = r and k.key = 'pack:' || x.pack)
      else x.pack = 'theme:' || theme end
    order by exists (select 1 from daily_activities y where y.room_id = r and (y.payload->>'qid')::int = x.id), random()
    limit case when theme is null then 1 else 3 end
  loop
    insert into daily_activities (room_id, day, slot, bought_by, payload)
    values (r, d, coalesce((select max(slot) from daily_activities where room_id = r and day = d and type = 'question'), 0) + 1, u,
            jsonb_build_object('qid', q.id, 'text', q.text, 'kind', q.kind, 'theme', theme, 'price', price))
    returning * into a;
    if n = 0 then first := a; end if;
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'aucune question'; end if;
  update rooms set question_heat = h + 1, question_heat_at = now() where id = r;
  return first;
end
$$;

revoke execute on function question_price(uuid) from public, anon, authenticated;
revoke execute on function buy_question(uuid, uuid, text) from public, anon, authenticated;

-- Questions à thème (seulement en pack acheté).
insert into questions (text, kind, pack) values
  -- Amour
  ('Quel a été ton premier coup de cœur ?', 'open', 'theme:amour'),
  ('Quel est le rendez-vous parfait selon toi ?', 'open', 'theme:amour'),
  ('Quelle est la plus belle déclaration que tu aies vue ou reçue ?', 'open', 'theme:amour'),
  ('Quel détail te fait craquer chez quelqu''un ?', 'open', 'theme:amour'),
  ('Quel est ton pire râteau ?', 'open', 'theme:amour'),
  ('Quelle chanson te fait penser à l''amour ?', 'open', 'theme:amour'),
  ('Qui est le plus romantique ?', 'vote', 'theme:amour'),
  ('Qui tombe amoureux le plus vite ?', 'vote', 'theme:amour'),
  ('Qui organiserait la demande en mariage la plus folle ?', 'vote', 'theme:amour'),
  ('Qui serait le meilleur entremetteur ?', 'vote', 'theme:amour'),
  -- Enfance
  ('Quel était ton dessin animé préféré ?', 'open', 'theme:enfance'),
  ('Quel métier voulais-tu faire petit ?', 'open', 'theme:enfance'),
  ('Quelle est ta plus grosse bêtise d''enfant ?', 'open', 'theme:enfance'),
  ('Quel jouet aimerais-tu retrouver ?', 'open', 'theme:enfance'),
  ('Quel goûter te ramène en enfance ?', 'open', 'theme:enfance'),
  ('Quelle peur d''enfant te fait sourire aujourd''hui ?', 'open', 'theme:enfance'),
  ('Qui était sûrement le plus turbulent à l''école ?', 'vote', 'theme:enfance'),
  ('Qui était sûrement le chouchou des profs ?', 'vote', 'theme:enfance'),
  ('Qui a gardé le plus son âme d''enfant ?', 'vote', 'theme:enfance'),
  ('Qui gagnerait encore à cache-cache ?', 'vote', 'theme:enfance'),
  -- Confidences
  ('Quel secret pourrais-tu enfin avouer ici ?', 'open', 'theme:confidences'),
  ('De quoi es-tu secrètement fier ?', 'open', 'theme:confidences'),
  ('Quelle habitude bizarre as-tu ?', 'open', 'theme:confidences'),
  ('Quel est ton plaisir coupable ?', 'open', 'theme:confidences'),
  ('Quelle est la dernière fois que tu as menti ?', 'open', 'theme:confidences'),
  ('Qu''est-ce qui te fait vraiment peur ?', 'open', 'theme:confidences'),
  ('Qui garde le mieux un secret ?', 'vote', 'theme:confidences'),
  ('Qui a le plus de squelettes dans le placard ?', 'vote', 'theme:confidences'),
  ('Qui craquerait le premier à un interrogatoire ?', 'vote', 'theme:confidences'),
  ('Qui mène une double vie, c''est sûr ?', 'vote', 'theme:confidences'),
  -- Philo
  ('Qu''est-ce qui rend une vie réussie ?', 'open', 'theme:philo'),
  ('Vaut-il mieux tout savoir ou tout oublier ?', 'open', 'theme:philo'),
  ('Quelle règle changerais-tu dans le monde ?', 'open', 'theme:philo'),
  ('Qu''as-tu changé d''avis récemment ?', 'open', 'theme:philo'),
  ('Le bonheur, ça s''apprend ?', 'open', 'theme:philo'),
  ('Quel conseil donnerais-tu à toi il y a dix ans ?', 'open', 'theme:philo'),
  ('Qui a la plus grande sagesse ?', 'vote', 'theme:philo'),
  ('Qui débattrait des heures sur n''importe quoi ?', 'vote', 'theme:philo'),
  ('Qui serait gourou d''une secte (gentille) ?', 'vote', 'theme:philo'),
  ('Qui a le plus de recul sur la vie ?', 'vote', 'theme:philo'),
  -- Absurde
  ('Si tu étais un légume, lequel et pourquoi ?', 'open', 'theme:absurde'),
  ('Quel super-pouvoir complètement inutile voudrais-tu ?', 'open', 'theme:absurde'),
  ('Ton chat parle soudain : quelle est sa première phrase ?', 'open', 'theme:absurde'),
  ('Invente une fête nationale. On y fait quoi ?', 'open', 'theme:absurde'),
  ('Quel objet de ta cuisine serait le meilleur président ?', 'open', 'theme:absurde'),
  ('Tu deviens un meuble pour une journée : lequel ?', 'open', 'theme:absurde'),
  ('Qui serait le premier à parler aux pigeons ?', 'vote', 'theme:absurde'),
  ('Qui survivrait dans un monde de dinosaures ?', 'vote', 'theme:absurde'),
  ('Qui a sûrement été un canard dans une vie antérieure ?', 'vote', 'theme:absurde'),
  ('Qui finirait roi d''un pays imaginaire ?', 'vote', 'theme:absurde'),
  -- Gourmandise
  ('Quel est ton repas de dernier jour sur Terre ?', 'open', 'theme:gourmand'),
  ('Quel plat sais-tu cuisiner les yeux fermés ?', 'open', 'theme:gourmand'),
  ('Quel aliment détestes-tu en secret ?', 'open', 'theme:gourmand'),
  ('Sucré ou salé, et pourquoi ?', 'open', 'theme:gourmand'),
  ('Quelle est ta pire expérience culinaire ?', 'open', 'theme:gourmand'),
  ('Quelle recette de famille mérite d''être connue ?', 'open', 'theme:gourmand'),
  ('Qui finit toujours les plats des autres ?', 'vote', 'theme:gourmand'),
  ('Qui ouvrirait le meilleur restaurant ?', 'vote', 'theme:gourmand'),
  ('Qui mange le plus bizarrement ?', 'vote', 'theme:gourmand'),
  ('Qui gagnerait un concours de pâtisserie ?', 'vote', 'theme:gourmand')
on conflict (text) do nothing;
