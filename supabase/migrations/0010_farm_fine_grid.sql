-- Ferme sur une grille fine (12×12) avec un chat qui se déplace.
-- Les objets ont maintenant une taille ; (x, y) est leur coin haut-gauche.

-- Conversion des fermes existantes : l'ancienne grille 6×6 devient 12×12 (chaque case → 2×2).
update farm_tiles set
  x = x * 2,
  y = y * 2,
  kind = case kind when 'field' then 'planter' when 'bakery' then 'oven' else kind end;

-- Position du chat de chaque joueur (enregistrée là où il s'arrête ; visible des visiteurs).
create table farm_cats (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  x int not null,
  y int not null,
  primary key (room_id, user_id)
);
alter table farm_cats enable row level security;
create policy "membres" on farm_cats for select using (is_member(room_id));
