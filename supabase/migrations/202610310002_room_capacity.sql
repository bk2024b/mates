-- Après les migrations identité, commandes et chat.
-- Les salons déjà créés gardent leur capacité : elle est également fixée dans LiveKit.
begin;
alter table public.rooms drop constraint if exists rooms_capacity_check;
alter table public.rooms add constraint rooms_capacity_check check (capacity between 2 and 50);
alter table public.rooms alter column capacity set default 50;
drop policy rooms_insert_owner on public.rooms;
create policy rooms_insert_owner on public.rooms for insert to authenticated with check (
 host_id=(select auth.uid()) and status='open' and capacity=50 and controls_enabled=false and chat_enabled=false
 and stage_owner_id is null and stage_expires_at is null and control_lock is null
 and coalesce((auth.jwt()->>'is_anonymous')::boolean,true)=false
);
commit;
