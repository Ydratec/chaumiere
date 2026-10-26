-- Défis du jour : une même énigme pour toute la salle (ex. une grille d'Orapa Mine), chacun la résout de son côté.
-- La grille n'est pas stockée : le serveur la recalcule à partir d'une graine secrète (salle + jour).
-- log = ondes envoyées ({ from, to, colors }) ; misses = essais ratés ; score = ondes + 3 par essai raté.

create table daily_challenges (
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  kind text not null default 'orapa',
  log jsonb not null default '[]',
  misses int not null default 0,
  solved_at timestamptz,
  score int,
  reward int,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id, day, kind)
);
create index on daily_challenges (room_id, day, kind);
alter table daily_challenges enable row level security; -- aucune policy : lu et écrit seulement par le serveur
