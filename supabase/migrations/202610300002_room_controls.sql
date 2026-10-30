begin;
alter table public.rooms add column controls_enabled boolean not null default false;
alter table public.rooms add column stage_owner_id uuid references auth.users(id) on delete set null;
alter table public.rooms add column stage_expires_at timestamptz;
alter table public.rooms add column control_lock uuid;
alter table public.rooms add column host_absent_since timestamptz;
create table public.room_presenters(room_id text not null references public.rooms(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,primary key(room_id,user_id));
create table public.room_exclusions(room_id text not null references public.rooms(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,primary key(room_id,user_id));
create table public.room_commands(id uuid primary key,room_id text not null references public.rooms(id) on delete cascade,actor_id uuid not null,action text not null,target_id uuid,status text not null default 'pending',created_at timestamptz not null default now());
alter table public.room_presenters enable row level security;
alter table public.room_exclusions enable row level security;
alter table public.room_commands enable row level security;
revoke all on public.room_presenters,public.room_exclusions,public.room_commands from anon,authenticated;
grant all on public.room_presenters,public.room_exclusions,public.room_commands to service_role;
grant all on public.rooms,public.room_members,public.profiles to service_role;
-- Empêcher une insertion client de choisir un état de contrôle ou une scène déjà attribuée.
drop policy rooms_insert_owner on public.rooms;
create policy rooms_insert_owner on public.rooms for insert to authenticated with check (
 host_id=(select auth.uid()) and status='open' and capacity=12 and controls_enabled=false
 and stage_owner_id is null and stage_expires_at is null and control_lock is null
 and coalesce((auth.jwt()->>'is_anonymous')::boolean,true)=false
);
create or replace function public.join_mates_room(p_room_id text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_host uuid;v_user uuid:=auth.uid();begin
 if v_user is null then raise exception 'authentication_required';end if;
 select host_id into v_host from public.rooms where id=p_room_id and status='open' for update;
 if not found then raise exception 'room_unavailable';end if;
 if exists(select 1 from public.room_exclusions where room_id=p_room_id and user_id=v_user) then raise exception 'participant_excluded';end if;
 insert into public.room_members(room_id,user_id,role) values(p_room_id,v_user,case when v_host=v_user then 'host' else 'participant' end)
 on conflict(room_id,user_id) do update set last_joined_at=now(),role=excluded.role;
 return v_host;end;$$;
-- Réservé au backend. Le rôle, l’éligibilité et l’idempotence sont vérifiés dans la même transaction.
create function public.begin_mates_control(p_room_id text,p_actor uuid,p_action text,p_target uuid,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.rooms; c public.room_commands; v_owner uuid;
begin
 select * into r from public.rooms where id=p_room_id for update;
 if not found or not r.controls_enabled then raise exception 'controls_unavailable';end if;
 if p_actor is null or not exists(select 1 from public.room_members where room_id=p_room_id and user_id=p_actor) or exists(select 1 from public.room_exclusions where room_id=p_room_id and user_id=p_actor) then raise exception 'access_denied';end if;
 select * into c from public.room_commands where id=p_request;
 if found then
  if c.room_id<>p_room_id or c.actor_id<>p_actor or c.action<>p_action or c.target_id is distinct from p_target then raise exception 'idempotency_conflict';end if;
  if c.status='done' then return jsonb_build_object('done',true);end if;
  raise exception 'command_in_progress';
 end if;
 if r.status<>'open' and p_action<>'close' then raise exception 'room_closed';end if;
 if p_action in ('presenter_add','presenter_remove','kick','close') and p_actor<>r.host_id then raise exception 'host_required';end if;
 if p_action not in ('acquire','stop','presenter_add','presenter_remove','kick','close') then raise exception 'invalid_action';end if;
 if p_action='close' then
  update public.rooms set status='closed' where id=p_room_id;
 else
  if r.control_lock is not null then raise exception 'command_in_progress';end if;
  if p_action='acquire' then
   if p_actor<>r.host_id and not exists(select 1 from public.room_presenters where room_id=p_room_id and user_id=p_actor) then raise exception 'presenter_required';end if;
   if r.stage_owner_id is not null and r.stage_owner_id<>p_actor and p_actor<>r.host_id then raise exception 'stage_busy';end if;
  end if;
  if p_action='stop' and p_actor<>r.host_id and r.stage_owner_id is distinct from p_actor then raise exception 'access_denied';end if;
  if p_action in ('presenter_add','presenter_remove','kick') then
   if p_target is null or p_target=r.host_id or not exists(select 1 from public.room_members where room_id=p_room_id and user_id=p_target) then raise exception 'invalid_target';end if;
  end if;
  update public.rooms set control_lock=p_request where id=p_room_id;
 end if;
 if p_action='kick' then insert into public.room_exclusions values(p_room_id,p_target) on conflict do nothing;end if;
 insert into public.room_commands(id,room_id,actor_id,action,target_id) values(p_request,p_room_id,p_actor,p_action,p_target);
 return jsonb_build_object('done',false,'previousOwner',r.stage_owner_id);
end;$$;
create function public.finish_mates_control(p_room_id text,p_request uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.room_commands;r public.rooms;begin
 select * into r from public.rooms where id=p_room_id for update;
 select * into c from public.room_commands where id=p_request and room_id=p_room_id;
 if not found then raise exception 'command_unknown';end if;
 if c.action<>'close' and (r.status<>'open' or r.control_lock is distinct from p_request) then raise exception 'stale_command';end if;
 if c.action='presenter_add' then insert into public.room_presenters values(p_room_id,c.target_id) on conflict do nothing;end if;
 if c.action in ('presenter_remove','kick') then delete from public.room_presenters where room_id=p_room_id and user_id=c.target_id;end if;
 update public.rooms set stage_owner_id=case when c.action='acquire' then c.actor_id when c.action in ('stop','close') or (c.action in ('kick','presenter_remove') and stage_owner_id=c.target_id) then null else stage_owner_id end,
 stage_expires_at=case when c.action='acquire' then now()+interval '30 seconds' else stage_expires_at end,
 control_lock=case when control_lock=p_request or c.action='close' then null else control_lock end where id=p_room_id;
 update public.room_commands set status='done' where id=p_request;
end;$$;
revoke all on function public.begin_mates_control(text,uuid,text,uuid,uuid), public.finish_mates_control(text,uuid) from public,anon,authenticated;
grant execute on function public.begin_mates_control(text,uuid,text,uuid,uuid), public.finish_mates_control(text,uuid) to service_role;
commit;
