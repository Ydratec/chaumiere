-- Fleurs variées et bouquets : un cadeau peut être une fleur (item = sa variété) ou un bouquet (item = 'bouquet',
-- contents = { variété: nombre }). Le petit mot est écrit par le joueur. Ouvrir un cadeau fait découvrir ses fleurs (album).

alter table farm_gifts add column contents jsonb;

drop function farm_gift(uuid, uuid, uuid, text, text);
-- Offrir (tout ou rien) : retire les fleurs de la réserve du donneur et crée le cadeau (un par jour et par ami).
create function farm_gift(r uuid, g uuid, rcv uuid, items jsonb, msg text) returns void
  language plpgsql as
$$
begin
  perform farm_add_items(r, g, (select jsonb_object_agg(k, -(v::int)) from jsonb_each_text(items) as t(k, v)));
  insert into farm_gifts (room_id, giver, receiver, item, contents, message)
  values (r, g, rcv,
    case when (select count(*) from jsonb_object_keys(items)) = 1 and (select sum(v::int) from jsonb_each_text(items) as t(k, v)) = 1
         then (select k from jsonb_each_text(items) as t(k, v) limit 1) else 'bouquet' end,
    items, nullif(trim(msg), ''));
end
$$;

-- Ouvrir : une seule fois, par son destinataire ; les fleurs reçues sont ajoutées à son album.
create or replace function farm_open_gift(gid bigint, rcv uuid) returns setof farm_gifts
  language plpgsql as
$$
declare f farm_gifts; k text; v int;
begin
  update farm_gifts set opened = true where id = gid and receiver = rcv and not opened returning * into f;
  if not found then return; end if;
  for k, v in select key, value::int from jsonb_each_text(coalesce(f.contents, jsonb_build_object(f.item, 1))) loop
    insert into farm_stats (room_id, user_id, key, count) values (f.room_id, rcv, 'bloom:' || k, v)
    on conflict (room_id, user_id, key) do update set count = farm_stats.count + excluded.count;
  end loop;
  return next f;
end
$$;

revoke execute on function farm_gift(uuid, uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function farm_open_gift(bigint, uuid) from public, anon, authenticated;
