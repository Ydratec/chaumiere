-- Tickets à gratter : le serveur tire le lot et la disposition à l'achat ; gratter n'est que l'affichage.
-- layout = la règle tirée et la disposition des cases ; prize = ce qui est versé quand le ticket est gratté (null : perdu).

create table scratch_cards (
  id bigint generated always as identity primary key,
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  layout jsonb not null,
  prize jsonb,
  price int not null,
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);
create index on scratch_cards (room_id, user_id, claimed);
alter table scratch_cards enable row level security; -- aucune policy : lu et écrit seulement par le serveur

-- Acheter (tout ou rien) : retire le prix, crée le ticket. Renvoie son id.
create function scratch_buy(r uuid, u uuid, price int, k text, lay jsonb, pz jsonb) returns bigint
  language plpgsql as
$$
declare cid bigint;
begin
  perform farm_add_items(r, u, jsonb_build_object('coins', -price));
  insert into scratch_cards (room_id, user_id, kind, layout, prize, price) values (r, u, k, lay, pz, price) returning id into cid;
  return cid;
end
$$;

-- Réclamer : une seule fois, par son propriétaire ; verse le lot. Renvoie le lot (null si perdu ou déjà réclamé).
create function scratch_claim(cid bigint, u uuid) returns jsonb
  language plpgsql as
$$
declare c scratch_cards;
begin
  update scratch_cards set claimed = true where id = cid and user_id = u and not claimed returning * into c;
  if not found then return null; end if;
  if c.prize is not null then perform farm_add_items(c.room_id, u, c.prize); end if;
  return c.prize;
end
$$;

revoke execute on function scratch_buy(uuid, uuid, int, text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function scratch_claim(bigint, uuid) from public, anon, authenticated;
