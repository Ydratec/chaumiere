-- Notifications : anti-spam.
-- Deux niveaux : « pour toi » (on te défie, c'est ton tour…) et « salle » (une partie lancée, quelqu'un a répondu…).
-- Les notifications « salle » sont limitées (par personne qui envoie, par heure, par jour, une seule invitation
-- au quiz) ; revenir sur l'appli (user_presence) remet ces compteurs à zéro. La nuit (22 h – 8 h), les « salle »
-- ne partent pas et les « pour toi » attendent le matin, regroupées en une seule notification.

alter table notification_prefs add column quiz boolean not null default true;   -- Quiz : invitations, défis, revanches
alter table notification_prefs add column room boolean not null default true;   -- ce qui se passe dans la salle
alter table notification_prefs add column quiet boolean not null default true;  -- heures calmes 22 h – 8 h

-- Dernière activité dans l'appli (mise à jour au plus une fois par minute).
create table user_presence (
  user_id uuid primary key references auth.users on delete cascade,
  seen_at timestamptz not null default now()
);

-- Notifications « salle » envoyées (pour les limites) ; on ne garde que les 2 derniers jours.
create table notification_sent (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  topic text not null,
  sender uuid,
  sent_at timestamptz not null default now()
);
create index notification_sent_user on notification_sent (user_id, sent_at);

-- Notifications « pour toi » reçues pendant les heures calmes : envoyées le matin en une seule.
create table notification_queue (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  body text not null,
  url text not null,
  created_at timestamptz not null default now()
);
create index notification_queue_user on notification_queue (user_id);

alter table user_presence enable row level security;
alter table notification_sent enable row level security;
alter table notification_queue enable row level security;

create function touch_presence(u uuid) returns void language sql set search_path = public as $$
  insert into user_presence (user_id, seen_at) values (u, now())
  on conflict (user_id) do update set seen_at = now() where user_presence.seen_at < now() - interval '1 minute';
$$;
revoke all on function touch_presence(uuid) from public, anon, authenticated;
grant execute on function touch_presence(uuid) to service_role;
