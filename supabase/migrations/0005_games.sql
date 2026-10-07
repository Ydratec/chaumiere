-- Mini-jeux à deux (Memory) : défis lancés à la salle ou à un joueur.
-- Les écritures passent par les server actions (service role) : le jeu est arbitré côté serveur.

create table games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms on delete cascade,
  type text not null default 'memory',
  creator uuid not null references auth.users on delete cascade,
  target uuid references auth.users on delete cascade, -- null = toute la salle
  opponent uuid references auth.users on delete cascade,
  status text not null default 'open' check (status in ('open', 'playing', 'finished', 'cancelled')),
  state jsonb,   -- état public (cartes visibles, tour, scores…)
  version int not null default 0, -- verrou optimiste
  created_at timestamptz not null default now()
);

-- Le plateau complet (emplacement des paires) n'est jamais lisible par les clients : RLS sans aucune policy.
create table game_secrets (
  game_id uuid primary key references games on delete cascade,
  deck jsonb not null
);

alter table games enable row level security;
alter table game_secrets enable row level security;

create policy "membres" on games for select using (is_member(room_id));

alter publication supabase_realtime add table games;
