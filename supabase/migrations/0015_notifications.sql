-- Notifications push. Tout passe par le serveur (service role) : RLS activée, aucune policy.

-- Un abonnement par appareil (navigateur / app installée).
create table push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users on delete cascade,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- Ce que chacun veut recevoir (pas de ligne = tout activé).
create table notification_prefs (
  user_id uuid primary key references auth.users on delete cascade,
  question boolean not null default true,
  games boolean not null default true,
  chat boolean not null default true,
  farm boolean not null default true
);

-- Anti-spam : dernier envoi par personne et par sujet (ex. « chat:<activité> », « question:<jour>:<salle> »).
create table notification_log (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table push_subscriptions enable row level security;
alter table notification_prefs enable row level security;
alter table notification_log enable row level security;

-- Récoltes : déjà signalées ou non (remis à false à chaque nouvelle production).
alter table farm_tiles add column notified boolean not null default false;
