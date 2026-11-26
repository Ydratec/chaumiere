-- Question inverse : pour 200 pièces (prix fixe, ne fait pas monter le prix des questions en plus), un membre pose
-- l'inverse d'une question du jour (« Qui serait le dernier debout en soirée ? » → « Qui serait le premier couché ? »).
-- C'est une question achetée comme les autres (slot > 0, même jour, même format, même personne visée), reliée à
-- l'originale par payload.inverse_of : l'appli l'affiche sous l'originale, dans le même onglet, avec la même discussion.
-- Une seule inverse par question ; on n'inverse pas une inverse ; seulement les formats où l'on choisit des membres.

create unique index daily_activities_inverse_once on daily_activities ((payload->>'inverse_of')) where payload ? 'inverse_of';

create function buy_inverse(r uuid, u uuid, orig uuid, txt text) returns daily_activities
  language plpgsql as
$$
declare
  d date;
  o daily_activities;
  a daily_activities;
begin
  -- Verrou sur la salle : deux achats simultanés de la même inverse ne paient pas deux fois.
  select ((now() at time zone 'Europe/Paris') - make_interval(hours => question_hour))::date into d from rooms where id = r for update;
  select * into o from daily_activities where id = orig and room_id = r and type = 'question';
  if o.id is null or o.day <> d then raise exception 'question introuvable' using errcode = 'no_data_found'; end if;
  if o.payload ? 'inverse_of' or coalesce(o.payload->>'kind', 'open') not in ('vote', 'rank', 'duo') then
    raise exception 'question non inversible' using errcode = 'invalid_parameter_value';
  end if;
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

revoke execute on function buy_inverse(uuid, uuid, uuid, text) from public, anon, authenticated;
