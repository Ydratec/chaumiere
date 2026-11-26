-- Questions inverses choisies une par une : seules les questions de la base qui ont une inverse écrite ici peuvent
-- être inversées (le texte est fixé, plus personne ne l'écrit). Écartées volontairement : celles dont l'inverse
-- désignerait quelqu'un de façon blessante (le moins bon ami, parent, conseiller, le moins drôle, le pire coloc…),
-- l'amour et le flirt, l'apparence, l'argent, la confiance (secrets, rancune), les questions qui visent quelqu'un ({x}),
-- les classements (l'inverse n'est que l'ordre retourné), les questions de l'Avent, et les questions sans vrai contraire.

alter table questions add column inverse text;

update questions q set inverse = v.inverse from (values
  (66, 'Qui vivrait le plus heureux loin des projecteurs ?'),
  (68, 'Qui arriverait en avance à son propre mariage ?'),
  (69, 'Qui fuirait le plus vite la politique ?'),
  (70, 'Qui a le rire le plus discret ?'),
  (71, 'Qui préfère une soirée tranquille à la maison ?'),
  (72, 'Qui ne quitterait jamais sa ville ?'),
  (73, 'Qui serait capable de rater des pâtes ?'),
  (74, 'Qui paniquerait le plus devant les caméras d''un jeu télé ?'),
  (76, 'Qui ne verrait pas l''indice même sous son nez ?'),
  (77, 'Qui vivrait le plus volontiers sans animaux ?'),
  (78, 'Qui reste de marbre devant les films les plus tristes ?'),
  (79, 'Qui aurait le plus de mal sur une piste de danse ?'),
  (80, 'Qui passerait un week-end à budget illimité tranquille chez lui ?'),
  (81, 'Qui serait le premier mordu par un zombie ?'),
  (83, 'Qui se perd le plus facilement ?'),
  (133, 'Qui se ferait croquer en premier par un T-rex ?'),
  (161, 'Qui préparerait son mariage deux ans à l''avance ?'),
  (353, 'Qui n''a jamais retenu une seule parole des tubes de l''époque ?'),
  (354, 'Qui n''a sûrement jamais eu MSN ?'),
  (355, 'Qui a changé de téléphone le plus souvent ?'),
  (229, 'Qui éclaterait de rire en essayant de raconter un bobard ?'),
  (230, 'Qui passerait la soirée à discuter avec une seule personne ?'),
  (231, 'Qui avouerait tout au juge dès la première question ?'),
  (233, 'Qui garderait ses secrets même après toute la bouteille ?'),
  (234, 'Qui met le plus de temps à répondre aux messages ?'),
  (114, 'Qui ne craquerait jamais, même sous la torture des chatouilles ?'),
  (182, 'Qui demanderait son chemin plutôt que de chercher sur Internet ?'),
  (184, 'Qui aurait le meilleur bluff au poker ?'),
  (332, 'Qui n''arrive jamais à choisir son camp ?'),
  (333, 'Qui abandonnerait un débat juste pour avoir la paix ?'),
  (334, 'Qui jetterait de l''huile sur le feu dans un débat ?'),
  (335, 'Qui trouve que le ketchup gâche tout ?'),
  (102, 'Qui était sûrement le plus sage à l''école ?'),
  (103, 'Qui passait sûrement le plus de temps au fond de la classe ?'),
  (105, 'Qui se ferait trouver en premier à cache-cache ?'),
  (142, 'Qui ne partagerait son dessert pour rien au monde ?'),
  (144, 'Qui mange de la façon la plus classique ?'),
  (145, 'Qui raterait même un gâteau au yaourt ?'),
  (272, 'Qui n''a sûrement jamais rien fait d''interdit ?'),
  (273, 'Qui a sûrement tout fait au moins une fois ?'),
  (275, 'Qui resterait bien au chaud pendant que les autres partent à l''aventure ?'),
  (124, 'Qui serait le premier adepte de la secte (gentille) ?'),
  (276, 'Qui de nous supprimerait tous ses réseaux sociaux ?'),
  (278, 'Qui de nous ne pourrait pas vivre loin de la ville ?'),
  (279, 'Qui de nous serait éliminé en premier à Koh-Lanta ?'),
  (280, 'Qui de nous a les goûts musicaux les plus prévisibles ?'),
  (282, 'Qui de nous a le moins changé depuis qu''on se connaît ?'),
  (283, 'Qui de nous serait le premier couché en soirée ?'),
  (285, 'Qui de nous est le plus beau joueur ?'),
  (286, 'Qui de nous retrouverait son chemin sans GPS ?'),
  (287, 'Qui de nous se ferait démasquer en premier comme espion ?'),
  (288, 'Qui de nous est le plus difficile à réveiller ?'),
  (290, 'Qui de nous se ferait snober par tous les chats ?'),
  (291, 'Qui de nous a l''air fou mais est en réalité très sage ?'),
  (295, 'Qui de nous sera le papy ou la mamie le plus grognon ?'),
  (252, 'Qui choisirait toujours l''option la plus sûre ?'),
  (253, 'Qui choisit en une seconde sans réfléchir ?'),
  (254, 'Qui ne lâcherait jamais son téléphone ?'),
  (255, 'Qui saurait toujours attendre pour gagner plus ?'),
  (396, 'Quel duo se ferait arrêter en cinq minutes en braquant une banque ?'),
  (398, 'Quel duo ne tiendrait pas une journée sur une île déserte ?'),
  (401, 'Quel duo ferait faillite en une semaine avec un restaurant ?'),
  (402, 'Quel duo se ferait éliminer à la première question d''un jeu télé ?'),
  (404, 'Quel duo se perdrait dès la première étape de Pékin Express ?'),
  (405, 'Quel duo ferait brûler la dinde de Noël ?'),
  (407, 'Quel duo ferait fuir le public dès la première chanson ?')
) as v(id, inverse) where q.id = v.id;

drop function buy_inverse(uuid, uuid, uuid, text);
create function buy_inverse(r uuid, u uuid, orig uuid) returns daily_activities
  language plpgsql as
$$
declare
  d date;
  o daily_activities;
  txt text;
  a daily_activities;
begin
  -- Verrou sur la salle : deux achats simultanés de la même inverse ne paient pas deux fois.
  select ((now() at time zone 'Europe/Paris') - make_interval(hours => question_hour))::date into d from rooms where id = r for update;
  select * into o from daily_activities where id = orig and room_id = r and type = 'question';
  if o.id is null or o.day <> d then raise exception 'question introuvable' using errcode = 'no_data_found'; end if;
  select inverse into txt from questions where id = (o.payload->>'qid')::int;
  if txt is null or o.payload ? 'inverse_of' then raise exception 'question non inversible' using errcode = 'invalid_parameter_value'; end if;
  if exists (select 1 from daily_activities where payload->>'inverse_of' = orig::text) then
    raise exception 'déjà inversée' using errcode = 'unique_violation';
  end if;
  perform farm_add_items(r, u, jsonb_build_object('coins', -200));
  insert into daily_activities (room_id, day, slot, bought_by, payload)
  values (r, d, coalesce((select max(slot) from daily_activities where room_id = r and day = d and type = 'question'), 0) + 1, u,
          jsonb_strip_nulls(jsonb_build_object('text', txt, 'kind', o.payload->>'kind', 'target', o.payload->>'target',
                                               'inverse_of', orig, 'price', 200)))
  returning * into a;
  return a;
end
$$;

revoke execute on function buy_inverse(uuid, uuid, uuid) from public, anon, authenticated;
