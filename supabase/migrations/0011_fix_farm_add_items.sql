-- Correctif : avec « insert … on conflict », PostgreSQL vérifie la contrainte qty >= 0 sur la ligne
-- proposée (quantité négative) avant de voir le conflit : tout retrait (planter, vendre, construire…) échouait.
-- Désormais : un ajout insère ou incrémente ; un retrait met à jour la ligne existante et échoue s'il n'y en a pas assez.

create or replace function farm_add_items(r uuid, u uuid, delta jsonb) returns void
  language plpgsql as
$$
declare k text; v int;
begin
  for k, v in select key, value::int from jsonb_each_text(delta) loop
    if v >= 0 then
      insert into farm_items (room_id, user_id, item, qty) values (r, u, k, v)
      on conflict (room_id, user_id, item) do update set qty = farm_items.qty + excluded.qty;
    else
      update farm_items set qty = qty + v where room_id = r and user_id = u and item = k;
      if not found then raise exception 'pas assez de %', k using errcode = 'check_violation'; end if;
    end if;
  end loop;
end
$$;

revoke execute on function farm_add_items(uuid, uuid, jsonb) from public, anon, authenticated;
