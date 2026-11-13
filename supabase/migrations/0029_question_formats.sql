-- Questions : plus de diversité.
-- 1. Nouveaux formats (voir src/modules/questions/formats.ts) : choice (« tu préfères », 2 choix), rank (classer tout le monde),
--    duo (choisir deux personnes), with (« avec qui… » : un membre, pas soi). Les choix d'un « tu préfères » sont dans `options`.
-- 2. Une question peut viser quelqu'un : {x} dans le texte est remplacé, à sa création, par un membre tiré au hasard
--    (payload.target) ; la personne visée ne fait pas partie des choix.
-- 3. On retire les doublons et les questions trop génériques (l'historique garde son texte dans daily_activities.payload).

alter table questions add column options jsonb;
alter table questions drop constraint questions_kind_check;
alter table questions add constraint questions_kind_check check (kind in ('open', 'vote', 'with', 'choice', 'rank', 'duo'));

-- ---------- retraits ----------
-- doublons ou quasi-doublons (on garde la meilleure version)
delete from questions where id in (6, 296, 97, 99, 96, 177, 57, 118, 129, 110, 121, 98, 59, 300, 165, 180, 125, 123, 284, 67, 7, 11, 139, 24, 8);
-- trop génériques, ou qui n'ont jamais lancé la discussion
delete from questions where id in (1, 19, 10, 14, 15, 116, 117, 120, 40, 34, 56, 55, 26, 33, 29, 49, 60);

-- ---------- « tu préfères » et débats : de vrais choix à deux options ----------
update questions q set kind = 'choice', options = v.o::jsonb from (values
  (236, '["Quand", "Comment"]'), (237, '["Plus jamais de fromage", "Plus jamais de chocolat"]'), (238, '["Voler", "Être invisible"]'),
  (239, '["Revivre ma pire honte", "Lire mon journal intime"]'), (240, '["Un million maintenant", "5 000 € par mois à vie"]'),
  (241, '["Sans musique", "Sans films ni séries"]'), (242, '["Tout savoir du futur", "Changer une chose du passé"]'),
  (243, '["Toutes les langues", "Parler aux animaux"]'), (244, '["Toujours dire ce que je pense", "Ne plus jamais pouvoir mentir"]'),
  (245, '["Le luxe, seul", "Le camping avec le groupe"]'), (246, '["10 ans de plus", "10 ans de moins"]'),
  (247, '["Mon historique internet", "Ma galerie photo"]'), (248, '["Le plus drôle", "Le plus intelligent"]'),
  (249, '["La mer", "La montagne"]'), (250, '["Un mois sans téléphone", "Une semaine sans voir personne"]'),
  (251, '["Célèbre pour un truc ridicule", "Inconnu pour un truc génial"]'),
  (316, '["Pain au chocolat", "Chocolatine"]'), (317, '["Salée", "Sucrée"]'), (318, '["Un crime", "Du génie"]'),
  (319, '["Le lait avant", "Le lait après"]'), (320, '["Oui, c''est un sandwich", "Non, jamais"]'), (321, '["Le matin", "Le soir"]'),
  (322, '["Devant", "Derrière"]'), (323, '["Se coucher tôt", "Se lever tard"]'), (324, '["Jamais", "Parfois"]'),
  (326, '["Oui", "Jamais"]'), (327, '["Acceptable", "Insultant"]'), (329, '["Une Nutella", "Un Nutella"]'),
  (330, '["Oui, interdits", "Non, laissez-les"]'), (147, '["Coup de foudre", "Amour qui grandit"]')
) as v(id, o) where q.id = v.id;
update questions set text = 'Tu préfères pouvoir voler, ou être invisible ?' where id = 238;

-- ---------- nouvelles questions (questions du jour) ----------
insert into questions (text, kind, pack, options) values
  -- tu préfères
  ('Tu préfères un dîner aux chandelles, ou une soirée pizza devant un film ?', 'choice', 'base', '["Dîner aux chandelles", "Pizza et film"]'),
  ('Tu préfères vivre sans café, ou sans chocolat ?', 'choice', 'base', '["Sans café", "Sans chocolat"]'),
  ('Tu préfères des vacances au soleil, ou à la neige ?', 'choice', 'base', '["Au soleil", "À la neige"]'),
  ('Tu préfères une soirée jeux de société, ou une soirée karaoké ?', 'choice', 'base', '["Jeux de société", "Karaoké"]'),
  ('Tu préfères lire le livre, ou voir le film ?', 'choice', 'base', '["Le livre", "Le film"]'),
  ('Tu préfères les chats, ou les chiens ?', 'choice', 'base', '["Les chats", "Les chiens"]'),
  ('Tu préfères te lever à 5 h, ou te coucher à 3 h ?', 'choice', 'base', '["Me lever à 5 h", "Me coucher à 3 h"]'),
  ('Tu préfères un road trip en voiture, ou un voyage en avion ?', 'choice', 'base', '["Road trip", "Avion"]'),
  ('Tu préfères Noël en famille, ou Noël entre amis ?', 'choice', 'base', '["En famille", "Entre amis"]'),
  ('Tu préfères un cadeau surprise, ou choisir toi-même ton cadeau ?', 'choice', 'base', '["La surprise", "Je choisis"]'),
  ('Tu préfères ne plus jamais avoir froid, ou ne plus jamais avoir chaud ?', 'choice', 'base', '["Plus jamais froid", "Plus jamais chaud"]'),
  ('Tu préfères pouvoir mettre ta vie sur pause, ou revenir en arrière ?', 'choice', 'base', '["Mettre sur pause", "Revenir en arrière"]'),
  ('Tu préfères une maison à la campagne, ou un appartement en plein centre ?', 'choice', 'base', '["La campagne", "Le centre-ville"]'),
  ('Tu préfères manger toujours épicé, ou toujours sans sel ?', 'choice', 'base', '["Toujours épicé", "Toujours sans sel"]'),
  ('Tu préfères qu''on t''organise une fête surprise, ou organiser celle d''un ami ?', 'choice', 'base', '["Qu''on me la fasse", "L''organiser"]'),
  ('Tu préfères lire dans les pensées, ou voir l''avenir ?', 'choice', 'base', '["Lire dans les pensées", "Voir l''avenir"]'),
  ('Tu préfères chanter devant 1 000 personnes, ou danser seul devant tes collègues ?', 'choice', 'base', '["Chanter", "Danser"]'),
  ('Tu préfères des vacances sans téléphone, ou des vacances sans soleil ?', 'choice', 'base', '["Sans téléphone", "Sans soleil"]'),
  ('Tu préfères un vrai sapin, ou un sapin artificiel ?', 'choice', 'base', '["Un vrai", "Un artificiel"]'),
  ('Tu préfères ouvrir les cadeaux le 24 au soir, ou le 25 au matin ?', 'choice', 'base', '["Le 24 au soir", "Le 25 au matin"]'),
  -- classe-nous
  ('Classe-nous du plus ponctuel au plus en retard.', 'rank', 'base', null),
  ('Classe-nous : qui survivrait le plus longtemps à une invasion de zombies ?', 'rank', 'base', null),
  ('Classe-nous du meilleur au pire cuisinier.', 'rank', 'base', null),
  ('Classe-nous du plus fêtard au plus casanier.', 'rank', 'base', null),
  ('Classe-nous du plus bavard au plus discret.', 'rank', 'base', null),
  ('Classe-nous du plus têtu au plus conciliant.', 'rank', 'base', null),
  ('Classe-nous du plus sportif au plus canapé.', 'rank', 'base', null),
  ('Classe-nous : qui deviendra célèbre en premier ?', 'rank', 'base', null),
  ('Classe-nous du plus tête en l''air au plus organisé.', 'rank', 'base', null),
  ('Classe-nous du plus drôle au plus sérieux.', 'rank', 'base', null),
  ('Classe-nous du plus dépensier au plus économe.', 'rank', 'base', null),
  ('Classe-nous du plus matinal au plus couche-tard.', 'rank', 'base', null),
  ('Classe-nous du plus fan de Noël au plus Grinch.', 'rank', 'base', null),
  ('Classe-nous du meilleur au pire chanteur.', 'rank', 'base', null),
  -- duos
  ('Quel duo pour braquer une banque ?', 'duo', 'base', null),
  ('Quel duo pour organiser la meilleure soirée de l''année ?', 'duo', 'base', null),
  ('Quel duo pour survivre une semaine sur une île déserte ?', 'duo', 'base', null),
  ('Quel duo pour animer une émission de télé ?', 'duo', 'base', null),
  ('Quel duo finirait au poste de police après une soirée ?', 'duo', 'base', null),
  ('Quel duo pour ouvrir un restaurant ?', 'duo', 'base', null),
  ('Quel duo gagnerait un jeu télévisé ?', 'duo', 'base', null),
  ('Quel duo ferait le pire road trip ?', 'duo', 'base', null),
  ('Quel duo gagnerait Pékin Express ?', 'duo', 'base', null),
  ('Quel duo pour préparer le repas de Noël ?', 'duo', 'base', null),
  ('Quel duo serait le plus drôle en colocation ?', 'duo', 'base', null),
  ('Quel duo pour monter un groupe de musique ?', 'duo', 'base', null),
  -- avec qui
  ('Avec qui voudrais-tu rester coincé dans un ascenseur ?', 'with', 'base', null),
  ('Avec qui partirais-tu faire le tour du monde ?', 'with', 'base', null),
  ('Avec qui ne voudrais-tu surtout pas partager une chambre ?', 'with', 'base', null),
  ('Avec qui voudrais-tu monter une entreprise ?', 'with', 'base', null),
  ('Avec qui ne partirais-tu jamais en voiture ?', 'with', 'base', null),
  ('Avec qui voudrais-tu faire un saut en parachute ?', 'with', 'base', null),
  ('Avec qui ne jouerais-tu jamais au Monopoly ?', 'with', 'base', null),
  ('Avec qui voudrais-tu passer le réveillon ?', 'with', 'base', null),
  ('À qui confierais-tu ton plus grand secret ?', 'with', 'base', null),
  ('Avec qui ne voudrais-tu surtout pas être bloqué sur une île déserte ?', 'with', 'base', null),
  -- questions qui visent quelqu'un ({x})
  ('Quel surnom donnerais-tu à {x} ?', 'open', 'base', null),
  ('Décris {x} en trois mots.', 'open', 'base', null),
  ('Quel est ton meilleur souvenir avec {x} ?', 'open', 'base', null),
  ('Si {x} était un animal, lequel serait-ce ?', 'open', 'base', null),
  ('Quel cadeau ferais-tu à {x} pour Noël ?', 'open', 'base', null),
  ('Quelle chanson te fait penser à {x} ?', 'open', 'base', null),
  ('Quel métier {x} aurait pu faire dans une autre vie ?', 'open', 'base', null),
  ('Qu''est-ce que tout le monde devrait savoir sur {x} ?', 'open', 'base', null),
  ('Si {x} avait une émission de télé, de quoi parlerait-elle ?', 'open', 'base', null),
  ('Quelle est la qualité que tu préfères chez {x} ?', 'open', 'base', null),
  ('Quel film raconterait le mieux la vie de {x} ?', 'open', 'base', null),
  ('Quel plat ferais-tu goûter à {x} ?', 'open', 'base', null),
  ('{x} : plutôt du matin, ou du soir ?', 'choice', 'base', '["Du matin", "Du soir"]'),
  ('{x} : plutôt sucré, ou salé ?', 'choice', 'base', '["Sucré", "Salé"]'),
  ('{x} en soirée : plutôt piste de danse, ou buffet ?', 'choice', 'base', '["Piste de danse", "Buffet"]'),
  ('{x} en vacances : plutôt farniente, ou visites ?', 'choice', 'base', '["Farniente", "Visites"]'),
  ('{x} au restaurant : plutôt toujours le même plat, ou toujours un nouveau ?', 'choice', 'base', '["Toujours le même", "Toujours un nouveau"]'),
  ('Tu préfères partir en week-end avec {x} à la mer, ou à la montagne ?', 'choice', 'base', '["À la mer", "À la montagne"]'),
  ('{x} à Noël : plutôt cadeaux faits main, ou cadeaux achetés ?', 'choice', 'base', '["Faits main", "Achetés"]'),
  ('Qui connaît le mieux {x} ?', 'vote', 'base', null),
  ('Qui ferait le meilleur colocataire pour {x} ?', 'vote', 'base', null),
  ('Qui partirait en voyage avec {x} demain, sans hésiter ?', 'vote', 'base', null),
  ('Qui pourrait imiter {x} à la perfection ?', 'vote', 'base', null),
  ('Qui ferait le pire binôme avec {x} ?', 'vote', 'base', null),
  ('Quel duo organiserait l''anniversaire surprise de {x} ?', 'duo', 'base', null),
  ('Quel duo accompagnerait {x} dans sa plus grande aventure ?', 'duo', 'base', null),
  ('Classe-nous : qui connaît le mieux {x} ?', 'rank', 'base', null),
  ('Classe-nous : avec qui {x} partirait en vacances en premier ?', 'rank', 'base', null),
  ('Avec qui voudrais-tu préparer une surprise pour {x} ?', 'with', 'base', null),
  ('Avec qui {x} ne devrait jamais faire équipe ?', 'with', 'base', null);

-- ---------- création d'une question : choix, personne visée ; pas de format impossible dans une petite salle ----------
-- La question convient-elle à cette salle ? (n = nombre de membres : un classement ou un duo demande au moins 3 personnes)
create function question_fits(q questions, n int) returns boolean
  language sql immutable as
$$
  select case
    when q.text like '%{x}%' and q.kind in ('rank', 'duo') then n >= 4
    when q.text like '%{x}%' then n >= 2
    when q.kind in ('rank', 'duo') then n >= 3
    when q.kind = 'with' then n >= 2
    else true end
$$;

-- Ce qu'on enregistre pour la question : son texte (avec la personne visée), son format, ses choix.
create function question_payload(r uuid, q questions) returns jsonb
  language plpgsql volatile as
$$
declare t room_members;
begin
  if q.text like '%{x}%' then select * into t from room_members where room_id = r order by random() limit 1; end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'qid', q.id, 'kind', q.kind, 'options', q.options, 'target', t.user_id,
    'text', case when t.user_id is null then q.text else replace(q.text, '{x}', t.username) end));
end
$$;

create or replace function today_activity(r uuid) returns daily_activities
  language plpgsql security definer set search_path = public as
$$
declare
  d date := ((now() at time zone 'Europe/Paris') - make_interval(hours => (select question_hour from rooms where id = r)))::date;
  n int := (select count(*) from room_members where room_id = r);
  a daily_activities;
begin
  if not is_member(r) then raise exception 'not a member'; end if;
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

-- Question en plus : c'est l'acheteur qui l'écrit (`custom` = { text, kind, options }, déjà vérifié par le serveur) ;
-- un pack à thème reste tiré au hasard. (Nouvelle signature : l'ancienne est retirée pour éviter deux versions.)
drop function buy_question(uuid, uuid, text);
create function buy_question(r uuid, u uuid, theme text, custom jsonb default null) returns daily_activities
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
  members int := (select count(*) from room_members where room_id = r);
begin
  -- Verrou sur la salle : deux achats simultanés paient bien deux prix différents.
  select ((now() at time zone 'Europe/Paris') - make_interval(hours => question_hour))::date,
         greatest(0, question_heat - 0.35 * extract(epoch from now() - question_heat_at) / 86400)
    into d, h from rooms where id = r for update;
  price := question_price(r) * (case when theme is null then 1 else 5 end);
  perform farm_add_items(r, u, jsonb_build_object('coins', -price));

  if theme is null and custom is not null then
    insert into daily_activities (room_id, day, slot, bought_by, payload)
    values (r, d, coalesce((select max(slot) from daily_activities where room_id = r and day = d and type = 'question'), 0) + 1, u,
            jsonb_strip_nulls(jsonb_build_object('text', custom->>'text', 'kind', custom->>'kind', 'options', custom->'options', 'custom', true, 'price', price, 'n', 1)))
    returning * into first;
    update rooms set question_heat = h + 1, question_heat_at = now() where id = r;
    return first;
  end if;

  for q in
    select * from questions x
    where (case when theme is null
      then x.pack = 'base' or exists (select 1 from room_unlocks k where k.room_id = r and k.key = 'pack:' || x.pack)
      else x.pack = 'theme:' || theme end) and question_fits(x, members)
    order by exists (select 1 from daily_activities y where y.room_id = r and (y.payload->>'qid')::int = x.id), random()
    limit case when theme is null then 1 else 7 end
  loop
    insert into daily_activities (room_id, day, slot, bought_by, payload)
    values (r, d + n, coalesce((select max(slot) from daily_activities where room_id = r and day = d + n and type = 'question'), 0) + 1, u,
            question_payload(r, q) || jsonb_build_object('theme', theme, 'price', price, 'n', n + 1))
    returning * into a;
    if n = 0 then first := a; end if;
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'aucune question'; end if;
  update rooms set question_heat = h + 1, question_heat_at = now() where id = r;
  return first;
end
$$;

revoke execute on function buy_question(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function question_payload(uuid, questions) from public, anon, authenticated;
