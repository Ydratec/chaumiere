-- Cadeaux : chaque fleur offerte porte un petit mot, et une fois ouverte elle rejoint la collection
-- du destinataire (les cadeaux ouverts) au lieu de sa réserve : on la garde, on ne la vend pas.

alter table farm_gifts add column message text;

drop function farm_gift(uuid, uuid, uuid, text);
create function farm_gift(r uuid, g uuid, rcv uuid, it text, msg text) returns void
  language plpgsql as
$$
begin
  perform farm_add_items(r, g, jsonb_build_object(it, -1));
  insert into farm_gifts (room_id, giver, receiver, item, message) values (r, g, rcv, it, msg);
end
$$;

-- Ouvrir : une seule fois, par son destinataire. Le cadeau ouvert fait partie de sa collection.
create or replace function farm_open_gift(gid bigint, rcv uuid) returns setof farm_gifts
  language plpgsql as
$$
begin
  return query update farm_gifts set opened = true where id = gid and receiver = rcv and not opened returning *;
end
$$;

revoke execute on function farm_gift(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function farm_open_gift(bigint, uuid) from public, anon, authenticated;
