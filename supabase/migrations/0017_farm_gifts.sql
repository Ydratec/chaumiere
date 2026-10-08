-- Cadeaux entre serres : en visitant la serre d'un ami, on peut lui laisser une fleur, une fois par jour.
-- Le cadeau attend dans sa serre jusqu'à ce qu'il l'ouvre.

create table farm_gifts (
  id bigint generated always as identity primary key,
  room_id uuid not null references rooms on delete cascade,
  giver uuid not null references auth.users on delete cascade,
  receiver uuid not null references auth.users on delete cascade,
  item text not null,
  day date not null default (now() at time zone 'Europe/Paris')::date,
  opened boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, giver, receiver, day) -- un seul cadeau par jour et par ami
);

alter table farm_gifts enable row level security;
create policy "membres" on farm_gifts for select using (is_member(room_id));

-- Offrir : retire l'objet de la réserve du donneur et crée le cadeau (tout ou rien ;
-- un second cadeau le même jour viole la contrainte unique et annule aussi le retrait).
create function farm_gift(r uuid, g uuid, rcv uuid, it text) returns void
  language plpgsql as
$$
begin
  perform farm_add_items(r, g, jsonb_build_object(it, -1));
  insert into farm_gifts (room_id, giver, receiver, item) values (r, g, rcv, it);
end
$$;

-- Ouvrir : une seule fois, par son destinataire ; l'objet rejoint sa réserve. Renvoie le cadeau ouvert (ou rien).
create function farm_open_gift(gid bigint, rcv uuid) returns setof farm_gifts
  language plpgsql as
$$
declare f farm_gifts;
begin
  update farm_gifts set opened = true where id = gid and receiver = rcv and not opened returning * into f;
  if not found then return; end if;
  perform farm_add_items(f.room_id, rcv, jsonb_build_object(f.item, 1));
  return next f;
end
$$;

revoke execute on function farm_gift(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function farm_open_gift(bigint, uuid) from public, anon, authenticated;
