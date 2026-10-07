-- Limite les essais de PIN : après 5 échecs, l'identifiant est bloqué 15 minutes.
-- Accessible seulement côté serveur (service role) : RLS activée, aucune policy.
create table login_attempts (
  username text primary key,
  failures int not null default 0,
  locked_until timestamptz
);
alter table login_attempts enable row level security;
