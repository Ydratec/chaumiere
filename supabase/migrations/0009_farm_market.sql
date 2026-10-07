-- Marché de la ferme : échanges entre membres d'une salle. Les objets donnés sont mis en séquestre.

create table farm_offers (
  id bigint generated always as identity primary key,
  room_id uuid not null references rooms on delete cascade,
  seller uuid not null references auth.users on delete cascade,
  give jsonb not null,         -- { "wheat": 10 }
  want jsonb not null,         -- { "egg": 3 }
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  buyer uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

alter table farm_offers enable row level security;
create policy "membres" on farm_offers for select using (is_member(room_id));
alter publication supabase_realtime add table farm_offers;

create function farm_negate(j jsonb) returns jsonb language sql immutable as
$$ select coalesce(jsonb_object_agg(key, -(value::int)), '{}'::jsonb) from jsonb_each_text(j) $$;

-- Créer une offre : retire les objets donnés (séquestre) et publie l'offre.
create function farm_offer_create(r uuid, s uuid, g jsonb, w jsonb) returns bigint
  language plpgsql as
$$
declare i bigint;
begin
  perform farm_add_items(r, s, farm_negate(g));
  insert into farm_offers (room_id, seller, give, want) values (r, s, g, w) returning id into i;
  return i;
end
$$;

-- Accepter : verrouille l'offre (un seul acheteur), échange les objets ; tout ou rien.
create function farm_offer_accept(o bigint, r uuid, b uuid) returns boolean
  language plpgsql as
$$
declare f farm_offers;
begin
  select * into f from farm_offers where id = o and room_id = r and status = 'open' for update;
  if not found or f.seller = b then return false; end if;
  perform farm_add_items(f.room_id, b, farm_negate(f.want));
  perform farm_add_items(f.room_id, b, f.give);
  perform farm_add_items(f.room_id, f.seller, f.want);
  update farm_offers set status = 'done', buyer = b where id = o;
  return true;
end
$$;

-- Annuler son offre : rend le séquestre.
create function farm_offer_cancel(o bigint, s uuid) returns boolean
  language plpgsql as
$$
declare f farm_offers;
begin
  select * into f from farm_offers where id = o and seller = s and status = 'open' for update;
  if not found then return false; end if;
  perform farm_add_items(f.room_id, s, f.give);
  update farm_offers set status = 'cancelled' where id = o;
  return true;
end
$$;

revoke execute on function farm_offer_create(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function farm_offer_accept(bigint, uuid, uuid) from public, anon, authenticated;
revoke execute on function farm_offer_cancel(bigint, uuid) from public, anon, authenticated;
