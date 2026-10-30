-- Mates étape 3. À exécuter une seule fois dans un nouveau projet Supabase.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 28),
  avatar_seed text not null default 'mates' check (char_length(avatar_seed) between 1 and 64),
  created_at timestamptz not null default now()
);
create table public.rooms (
  id text primary key check (id ~ '^mates-[a-f0-9]{24}$'),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  status text not null default 'open' check (status in ('open','closed')),
  capacity integer not null default 12 check (capacity between 2 and 12),
  created_at timestamptz not null default now()
);
create index rooms_host_created_idx on public.rooms(host_id, created_at desc);
create table public.room_members (
  room_id text not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('host','participant')),
  last_joined_at timestamptz not null default now(),
  primary key (room_id,user_id)
);
create index room_members_user_idx on public.room_members(user_id,room_id);
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
-- Les profils ne contiennent ni email, ni nom réel, ni permissions éditables.
revoke all on public.profiles, public.rooms, public.room_members from anon, authenticated;
grant select, insert on public.profiles to authenticated;
grant update(nickname, avatar_seed) on public.profiles to authenticated;
grant select, insert, delete on public.rooms to authenticated;
grant select on public.room_members to authenticated;
create policy profiles_read_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy members_read_self on public.room_members for select to authenticated using (user_id = (select auth.uid()));
create policy rooms_read_joined on public.rooms for select to authenticated using (
 host_id = (select auth.uid()) or exists (select 1 from public.room_members m where m.room_id = rooms.id and m.user_id = (select auth.uid()))
);
create policy rooms_insert_owner on public.rooms for insert to authenticated with check (
 host_id = (select auth.uid()) and status = 'open' and capacity = 12
 and coalesce((auth.jwt()->>'is_anonymous')::boolean, true) = false
);
create policy rooms_delete_owner on public.rooms for delete to authenticated using (host_id = (select auth.uid()));
-- Une seule voie d’écriture de participation. L’identité et le rôle sont calculés côté DB.
create function public.join_mates_room(p_room_id text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_host uuid; v_user uuid := auth.uid();
begin
 if v_user is null then raise exception 'authentication_required'; end if;
 select r.host_id into v_host from public.rooms r where r.id=p_room_id and r.status='open' for update;
 if not found then raise exception 'room_unavailable'; end if;
 insert into public.room_members(room_id,user_id,role)
 values (p_room_id,v_user,case when v_host=v_user then 'host' else 'participant' end)
 on conflict(room_id,user_id) do update set last_joined_at=now(), role=excluded.role;
 return v_host;
end;
$$;
revoke all on function public.join_mates_room(text) from public, anon;
grant execute on function public.join_mates_room(text) to authenticated;
commit;
