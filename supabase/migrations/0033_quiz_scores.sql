-- Géo Quiz : un score par partie terminée (onglet Quiz, page autonome public/quiz).
-- Sert au classement du défi du jour (première partie de chacun, jour de Paris) et aux records par jeu.
-- Lecture par les membres de la salle ; seul le serveur écrit (app/api/quiz/[roomId]).
-- À appliquer avant ou avec la mise en ligne : sans la table, le jeu marche mais n'enregistre rien (l'API répond 503).

create table quiz_scores (
  id bigint generated always as identity primary key,
  room_id uuid not null references rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  game text not null,              -- identifiant du jeu (geo, flag…) ou 'daily' pour le défi du jour
  level text not null,             -- facile | expert
  format text not null,            -- normal | survie
  cat text not null default '',    -- catégorie choisie (Monde, Plus grand ?, Monnaies et co), sinon ''
  score int not null,
  day date not null,               -- jour de Paris où la partie a été jouée
  created_at timestamptz not null default now()
);
create index quiz_scores_room_day on quiz_scores (room_id, game, day);
alter table quiz_scores enable row level security;
create policy "membres" on quiz_scores for select using (is_member(room_id));
