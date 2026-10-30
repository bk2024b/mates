begin;
alter table public.rooms add column chat_enabled boolean not null default false;
create table public.messages (
 seq bigint generated always as identity primary key,
 id uuid not null default gen_random_uuid() unique,
 room_id text not null references public.rooms(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 nickname text not null check(char_length(nickname) between 2 and 28),
 client_message_id uuid not null,
 body text not null check(char_length(body) between 1 and 1000),
 created_at timestamptz not null default now(),
 unique(room_id,author_id,client_message_id)
);
create index messages_room_seq_idx on public.messages(room_id,seq);
create table public.blocks(blocker_id uuid not null references auth.users(id) on delete cascade,blocked_id uuid not null references auth.users(id) on delete cascade,primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id));
create table public.room_chat_limits(room_id text not null references public.rooms(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,message_times timestamptz[] not null default '{}',reaction_times timestamptz[] not null default '{}',primary key(room_id,user_id));
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.room_chat_limits enable row level security;
revoke all on public.messages,public.blocks,public.room_chat_limits from anon,authenticated;
grant select on public.messages to authenticated;
grant select,insert,delete on public.blocks to authenticated;
grant all on public.messages,public.blocks,public.room_chat_limits to service_role;
grant usage,select on sequence public.messages_seq_seq to service_role;
create policy blocks_own_read on public.blocks for select to authenticated using(blocker_id=(select auth.uid()));
create policy blocks_own_insert on public.blocks for insert to authenticated with check(blocker_id=(select auth.uid()) and blocked_id<>(select auth.uid()));
create policy blocks_own_delete on public.blocks for delete to authenticated using(blocker_id=(select auth.uid()));
create function public.can_read_mates_chat(p_room_id text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.rooms where id=p_room_id and chat_enabled and status='open')
 and exists(select 1 from public.room_members where room_id=p_room_id and user_id=auth.uid())
 and not exists(select 1 from public.room_exclusions where room_id=p_room_id and user_id=auth.uid());
$$;
revoke all on function public.can_read_mates_chat(text) from public,anon;
grant execute on function public.can_read_mates_chat(text) to authenticated;
create policy messages_read_joined on public.messages for select to authenticated using(public.can_read_mates_chat(room_id));
-- Ne jamais permettre au navigateur d’activer le chat ou de modifier une scène lors de l’insertion.
drop policy rooms_insert_owner on public.rooms;
create policy rooms_insert_owner on public.rooms for insert to authenticated with check (
 host_id=(select auth.uid()) and status='open' and capacity=12 and controls_enabled=false and chat_enabled=false
 and stage_owner_id is null and stage_expires_at is null and control_lock is null
 and coalesce((auth.jwt()->>'is_anonymous')::boolean,true)=false
);
create function public.send_mates_message(p_room_id text,p_client_id uuid,p_body text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_times timestamptz[];v_name text;m public.messages;begin
 if not public.can_read_mates_chat(p_room_id) then raise exception 'chat_access_denied';end if;
 if p_body is null or char_length(btrim(p_body)) not between 1 and 1000 or p_client_id is null then raise exception 'invalid_message';end if;
 select nickname into v_name from public.profiles where id=v_user;
 if not found then raise exception 'profile_required';end if;
 insert into public.room_chat_limits(room_id,user_id) values(p_room_id,v_user) on conflict do nothing;
 select message_times into v_times from public.room_chat_limits where room_id=p_room_id and user_id=v_user for update;
 select * into m from public.messages where room_id=p_room_id and author_id=v_user and client_message_id=p_client_id;
 if found then if m.body<>btrim(p_body) then raise exception 'idempotency_conflict';end if;return to_jsonb(m);end if;
 select coalesce(array_agg(t),'{}') into v_times from unnest(v_times) t where t>clock_timestamp()-interval '10 seconds';
 if cardinality(v_times)>=5 then raise exception 'chat_rate_limited';end if;
 update public.room_chat_limits set message_times=array_append(v_times,clock_timestamp()) where room_id=p_room_id and user_id=v_user;
 insert into public.messages(room_id,author_id,nickname,client_message_id,body) values(p_room_id,v_user,v_name,p_client_id,btrim(p_body)) returning * into m;
 return to_jsonb(m);
end;$$;
create function public.send_mates_reaction(p_room_id text,p_emoji text) returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_times timestamptz[];begin
 if not public.can_read_mates_chat(p_room_id) then raise exception 'chat_access_denied';end if;
 if p_emoji is null or p_emoji not in ('👍','❤️','😂','🔥','👏','🤯') then raise exception 'invalid_reaction';end if;
 insert into public.room_chat_limits(room_id,user_id) values(p_room_id,v_user) on conflict do nothing;
 select reaction_times into v_times from public.room_chat_limits where room_id=p_room_id and user_id=v_user for update;
 select coalesce(array_agg(t),'{}') into v_times from unnest(v_times) t where t>clock_timestamp()-interval '10 seconds';
 if cardinality(v_times)>=10 then raise exception 'chat_rate_limited';end if;
 update public.room_chat_limits set reaction_times=array_append(v_times,clock_timestamp()) where room_id=p_room_id and user_id=v_user;
end;$$;
revoke all on function public.send_mates_message(text,uuid,text),public.send_mates_reaction(text,text) from public,anon;
grant execute on function public.send_mates_message(text,uuid,text),public.send_mates_reaction(text,text) to authenticated;
commit;
