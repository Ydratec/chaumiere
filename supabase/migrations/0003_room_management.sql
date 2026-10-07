-- Photos de profil / de salle, rôles admin. Les écritures passent par les server actions (service role).

alter table rooms add column avatar_url text;
alter table room_members
  add column avatar_url text,
  add column role text not null default 'member' check (role in ('admin', 'member'));

-- Salons existants : le premier membre (ordre alphabétique) devient admin.
update room_members m set role = 'admin'
from (select distinct on (room_id) room_id, user_id from room_members order by room_id, username) f
where m.room_id = f.room_id and m.user_id = f.user_id;

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict do nothing;
