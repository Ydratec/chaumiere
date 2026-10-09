-- Retours et vœux des joueurs, lus par le super-admin sur l'accueil de la salle.
-- kind = 'feedback' (gratuit) ou 'wish' (« demande spéciale » payée en pièces de la serre : le joueur demande d'ajouter quelque chose au jeu).

create table feedback (
  id bigint generated always as identity primary key,
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('feedback', 'wish')),
  text text not null check (char_length(text) between 1 and 1000),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index on feedback (done, created_at desc);
alter table feedback enable row level security; -- aucune policy : lu et écrit seulement par le serveur

-- Faire un vœu (tout ou rien) : retire le prix en pièces et enregistre la demande.
create function farm_wish(r uuid, u uuid, price int, txt text) returns void
  language plpgsql as
$$
begin
  perform farm_add_items(r, u, jsonb_build_object('coins', -price));
  insert into feedback (room_id, user_id, kind, text) values (r, u, 'wish', txt);
end
$$;
revoke execute on function farm_wish(uuid, uuid, int, text) from public, anon, authenticated;
