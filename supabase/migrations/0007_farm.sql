-- Ferme : chaque membre a sa grille de tuiles et son inventaire dans la salle.
-- Les écritures passent par les server actions (service role) ; les membres peuvent tout lire.

create table farm_tiles (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  x int not null,
  y int not null,
  kind text not null,          -- field, coop, bakery…
  item text,                   -- recette en cours (null = libre)
  started_at timestamptz,
  ready_at timestamptz,
  primary key (room_id, user_id, x, y)
);

create table farm_items (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  item text not null,          -- coins, wheat, egg…
  qty int not null check (qty >= 0),
  primary key (room_id, user_id, item)
);

alter table farm_tiles enable row level security;
alter table farm_items enable row level security;
create policy "membres" on farm_tiles for select using (is_member(room_id));
create policy "membres" on farm_items for select using (is_member(room_id));

-- Ajoute/retire des objets en une transaction : si une quantité deviendrait négative,
-- la contrainte check fait tout échouer (pas de stock négatif, même avec deux clics simultanés).
create function farm_add_items(r uuid, u uuid, delta jsonb) returns void
  language plpgsql as
$$
declare k text; v int;
begin
  for k, v in select key, value::int from jsonb_each_text(delta) loop
    insert into farm_items (room_id, user_id, item, qty) values (r, u, k, v)
    on conflict (room_id, user_id, item) do update set qty = farm_items.qty + excluded.qty;
  end loop;
end
$$;

revoke execute on function farm_add_items(uuid, uuid, jsonb) from public, anon, authenticated;
