import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const HOST = '11111111-1111-4111-8111-111111111111';
const GUEST = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const ROOM = 'mates-123456789012345678901234';
test('PostgreSQL réel : migration, isolation des profils, invités sans privilèges et attribution des rôles', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 grant usage on schema public,auth to authenticated,anon;
 grant execute on function auth.uid(), auth.jwt() to authenticated,anon;
 insert into auth.users values('${HOST}'),('${GUEST}'),('${OTHER}');`);
    await db.exec(readFileSync('supabase/migrations/202610300001_identity.sql', 'utf8'));
    async function asUser(id: string, anonymous: boolean) {
      await db.exec(
        `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false); select set_config('request.jwt.claims','{"is_anonymous":${anonymous}}',false);`,
      );
    }
    await asUser(HOST, false);
    await db.query('insert into public.profiles(id,nickname) values ($1,$2)', [HOST, 'Panda']);
    await db.query('insert into public.rooms(id,host_id,title) values ($1,$2,$3)', [
      ROOM,
      HOST,
      'Robotique',
    ]);
    await db.query('select public.join_mates_room($1)', [ROOM]);
    assert.equal(
      (await db.query<{ role: string }>('select role from public.room_members')).rows[0].role,
      'host',
    );
    await asUser(GUEST, true);
    assert.equal((await db.query('select * from public.profiles')).rows.length, 0);
    assert.equal((await db.query('select * from public.rooms')).rows.length, 0);
    await assert.rejects(
      db.query('insert into public.profiles(id,nickname) values ($1,$2)', [OTHER, 'Usurpation']),
    );
    await db.query('insert into public.profiles(id,nickname) values ($1,$2)', [GUEST, 'Invité']);
    await db.query('update public.profiles set nickname=$1 where id=$2', ['Mate', GUEST]);
    await assert.rejects(db.query('update public.profiles set id=$1 where id=$2', [OTHER, GUEST]));
    await assert.rejects(
      db.query('insert into public.rooms(id,host_id,title) values ($1,$2,$3)', [
        'mates-aaaaaaaaaaaaaaaaaaaaaaaa',
        GUEST,
        'Refusé',
      ]),
    );
    await assert.rejects(
      db.query('insert into public.room_members(room_id,user_id,role) values ($1,$2,$3)', [
        ROOM,
        GUEST,
        'host',
      ]),
    );
    await db.query('select public.join_mates_room($1)', [ROOM]);
    assert.equal(
      (await db.query<{ role: string }>('select role from public.room_members')).rows[0].role,
      'participant',
    );
    await assert.rejects(
      db.query("update public.room_members set role='host' where user_id=$1", [GUEST]),
    );
    assert.equal((await db.query('select * from public.rooms')).rows.length, 1);
    await asUser(OTHER, false);
    assert.equal((await db.query('select * from public.room_members')).rows.length, 0);
    await assert.rejects(
      db.query('insert into public.rooms(id,host_id,title) values ($1,$2,$3)', [
        'mates-bbbbbbbbbbbbbbbbbbbbbbbb',
        HOST,
        'Usurpation',
      ]),
    );
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select public.join_mates_room($1)', [ROOM]));
    await assert.rejects(db.query('select * from public.profiles'));
  } finally {
    await db.close();
  }
});
