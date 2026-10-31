import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
test('la migration autorise 50 places et conserve la capacité des anciens salons', async () => {
  const db = new PGlite();
  const host = '11111111-1111-4111-8111-111111111111';
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select '{"is_anonymous":false}'::jsonb$$;grant usage on schema public,auth to authenticated;insert into auth.users values('${host}');`,
    );
    for (const file of [
      '202610300001_identity.sql',
      '202610300002_room_controls.sql',
      '202610310001_room_chat.sql',
    ])
      await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'));
    await db.query('insert into public.rooms(id,host_id,title) values($1,$2,$3)', [
      'mates-' + 'a'.repeat(24),
      host,
      'Ancien salon',
    ]);
    await db.exec(readFileSync('supabase/migrations/202610310002_room_capacity.sql', 'utf8'));
    assert.equal(
      (await db.query<{ capacity: number }>('select capacity from public.rooms')).rows[0].capacity,
      12,
    );
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${host}',false);`,
    );
    const result = await db.query<{ capacity: number }>(
      'insert into public.rooms(id,host_id,title) values($1,$2,$3) returning capacity',
      ['mates-' + 'b'.repeat(24), host, 'Nouveau salon'],
    );
    assert.equal(result.rows[0].capacity, 50);
    await assert.rejects(
      db.query('insert into public.rooms(id,host_id,title,capacity) values($1,$2,$3,51)', [
        'mates-' + 'c'.repeat(24),
        host,
        'Trop grand',
      ]),
    );
    await assert.rejects(
      db.query(
        'insert into public.rooms(id,host_id,title,controls_enabled) values($1,$2,$3,true)',
        ['mates-' + 'd'.repeat(24), host, 'Fausse permission'],
      ),
    );
  } finally {
    await db.close();
  }
});
