-- Khôlle'ction : la collection de cartes passe du navigateur à la base, pour la retrouver sur tous les appareils.
-- card = clé de carte (« id » ou « id@variante », voir keyOf dans src/modules/tcg/cards.ts).

create table tcg_cards (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  card text not null,
  qty int not null check (qty > 0),
  primary key (room_id, user_id, card)
);
alter table tcg_cards enable row level security;
-- Les membres de la salle peuvent lire (pour les échanges plus tard) ; seul le serveur écrit.
create policy "membres" on tcg_cards for select using (is_member(room_id));

-- Ajoute des cartes (une entrée du tableau = un exemplaire).
create function tcg_add_cards(r uuid, u uuid, cards text[]) returns void
  language sql as
$$
  insert into tcg_cards (room_id, user_id, card, qty)
  select r, u, c, count(*) from unnest(cards) c group by c
  on conflict (room_id, user_id, card) do update set qty = tcg_cards.qty + excluded.qty;
$$;

-- Reprise d'une collection gardée dans un navigateur (V1 locale) : on n'accepte pas plus de cartes
-- que les boosters réellement ouverts (une ligne farm_stats « tcg:% » par booster) n'en ont donné.
-- `cards` est trié par le serveur (les plus rares d'abord). Renvoie le nombre de cartes reprises.
create function tcg_import(r uuid, u uuid, cards text[], per_booster int) returns int
  language plpgsql as
$$
declare budget int;
begin
  perform pg_advisory_xact_lock(hashtext('tcg_import:' || r || ':' || u));
  select per_booster * count(*) into budget from farm_stats where room_id = r and user_id = u and key like 'tcg:%';
  budget := budget - coalesce((select sum(qty) from tcg_cards where room_id = r and user_id = u), 0);
  if budget <= 0 then return 0; end if;
  cards := cards[1:budget];
  perform tcg_add_cards(r, u, cards);
  return coalesce(array_length(cards, 1), 0);
end
$$;

revoke execute on function tcg_add_cards(uuid, uuid, text[]) from public, anon, authenticated;
revoke execute on function tcg_import(uuid, uuid, text[], int) from public, anon, authenticated;
