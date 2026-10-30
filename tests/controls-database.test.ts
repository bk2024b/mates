import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const host = '11111111-1111-4111-8111-111111111111',
  a = '22222222-2222-4222-8222-222222222222',
  b = '33333333-3333-4333-8333-333333333333',
  room = 'mates-123456789012345678901234';
test('commandes PostgreSQL : rôles, sérialisation, idempotence, exclusion et fermeture', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select '{"is_anonymous":false}'::jsonb$$;grant usage on schema public,auth to anon,authenticated,service_role;insert into auth.users values('${host}'),('${a}'),('${b}');`,
    );
    await db.exec(readFileSync('supabase/migrations/202610300001_identity.sql', 'utf8'));
    await db.exec(readFileSync('supabase/migrations/202610300002_room_controls.sql', 'utf8'));
    await db.query(
      'insert into public.rooms(id,host_id,title,controls_enabled) values ($1,$2,$3,true)',
      [room, host, 'Test contrôles'],
    );
    for (const id of [host, a, b])
      await db.query('insert into public.room_members(room_id,user_id,role) values ($1,$2,$3)', [
        room,
        id,
        id === host ? 'host' : 'participant',
      ]);
    async function begin(
      actor: string,
      action: string,
      target: string | null = null,
      request = randomUUID(),
    ) {
      return {
        request,
        result: await db.query<{ result: { done: boolean } }>(
          'select public.begin_mates_control($1,$2,$3,$4,$5) as result',
          [room, actor, action, target, request],
        ),
      };
    }
    async function finish(request: string) {
      await db.query('select public.finish_mates_control($1,$2)', [room, request]);
    }
    await assert.rejects(begin(a, 'acquire'));
    await assert.rejects(begin(a, 'presenter_add', b));
    const promote = await begin(host, 'presenter_add', a);
    await assert.rejects(begin(host, 'presenter_add', b));
    await finish(promote.request);
    assert.equal(
      (await begin(host, 'presenter_add', a, promote.request)).result.rows[0].result.done,
      true,
    );
    const first = await begin(a, 'acquire');
    await assert.rejects(begin(host, 'acquire'));
    await finish(first.request);
    assert.equal(
      (await db.query<{ stage_owner_id: string }>('select stage_owner_id from public.rooms'))
        .rows[0].stage_owner_id,
      a,
    );
    const promoteB = await begin(host, 'presenter_add', b);
    await finish(promoteB.request);
    await assert.rejects(begin(b, 'acquire'));
    const takeover = await begin(host, 'acquire');
    await finish(takeover.request);
    const kick = await begin(host, 'kick', a);
    await finish(kick.request);
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);`,
    );
    await assert.rejects(db.query('select public.join_mates_room($1)', [room]));
    await assert.rejects(
      db.query('select public.begin_mates_control($1,$2,$3,$4,$5)', [
        room,
        a,
        'acquire',
        null,
        randomUUID(),
      ]),
    );
    await assert.rejects(
      db.query('update public.rooms set stage_owner_id=$1 where id=$2', [a, room]),
    );
    await db.exec('reset role;');
    const stopped = await begin(host, 'stop');
    await finish(stopped.request);
    // Une fermeture reste disponible même si une commande précédente est bloquée.
    const pending = await begin(b, 'acquire');
    const close = await begin(host, 'close');
    await finish(close.request);
    await assert.rejects(finish(pending.request));
    await assert.rejects(begin(b, 'acquire'));
    assert.equal(
      (await db.query<{ status: string }>('select status from public.rooms')).rows[0].status,
      'closed',
    );
  } finally {
    await db.close();
  }
});
