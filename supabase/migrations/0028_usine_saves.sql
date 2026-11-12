-- Usine de Noël : la partie de chaque joueur, par salle, gardée sur le serveur.
-- Elle suit le joueur d'un appareil à l'autre, et `saved_at` permet de faire tourner l'usine pendant son absence.
-- À appliquer avec la PR de l'Usine de Noël.

create table usine_saves (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  state jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
alter table usine_saves enable row level security;
-- Les membres de la salle peuvent lire (classements, défi final) ; seul le serveur écrit.
create policy "membres" on usine_saves for select using (is_member(room_id));
