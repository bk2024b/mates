import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const host = '11111111-1111-4111-8111-111111111111',
  guest = '22222222-2222-4222-8222-222222222222',
  outsider = '33333333-3333-4333-8333-333333333333',
  room = 'mates-123456789012345678901234';
test('chat PostgreSQL : accès, identité, doublons, quotas, blocages et exclusion', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select '{"is_anonymous":false}'::jsonb$$;grant usage on schema public,auth to anon,authenticated,service_role;insert into auth.users values('${host}'),('${guest}'),('${outsider}');`,
    );
    for (const name of [
      '202610300001_identity.sql',
      '202610300002_room_controls.sql',
      '202610310001_room_chat.sql',
    ])
      await db.exec(readFileSync('supabase/migrations/' + name, 'utf8'));
    await db.query(
      'insert into public.rooms(id,host_id,title,chat_enabled) values ($1,$2,$3,true)',
      [room, host, 'Chat test'],
    );
    for (const id of [host, guest]) {
      await db.query('insert into public.profiles(id,nickname) values ($1,$2)', [
        id,
        id === host ? 'Hôte' : 'Invité',
      ]);
      await db.query('insert into public.room_members(room_id,user_id,role) values($1,$2,$3)', [
        room,
        id,
        id === host ? 'host' : 'participant',
      ]);
    }
    async function asUser(id: string) {
      await db.exec(
        `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
      );
    }
    async function send(id: string, body: string) {
      return (
        await db.query<{ message: { id: string; author_id: string; body: string } }>(
          'select public.send_mates_message($1,$2,$3) as message',
          [room, id, body],
        )
      ).rows[0].message;
    }
    await asUser(outsider);
    await assert.rejects(send(randomUUID(), 'Intrusion'));
    assert.equal((await db.query('select * from public.messages')).rows.length, 0);
    await asUser(guest);
    const id = randomUUID();
    const first = await send(id, '  Bonjour <script>  ');
    assert.equal(first.author_id, guest);
    assert.equal(first.body, 'Bonjour <script>');
    assert.equal((await send(id, 'Bonjour <script>')).id, first.id);
    await assert.rejects(send(id, 'Autre corps'));
    for (let i = 0; i < 4; i++) await send(randomUUID(), 'Message ' + i);
    await assert.rejects(send(randomUUID(), 'Trop vite'));
    await assert.rejects(
      db.query(
        'insert into public.messages(room_id,author_id,nickname,client_message_id,body) values($1,$2,$3,$4,$5)',
        [room, host, 'Faux hôte', randomUUID(), 'Usurpation'],
      ),
    );
    for (let i = 0; i < 10; i++)
      await db.query('select public.send_mates_reaction($1,$2)', [room, '👍']);
    await assert.rejects(db.query('select public.send_mates_reaction($1,$2)', [room, '👍']));
    await assert.rejects(db.query('select public.send_mates_reaction($1,$2)', [room, '💀']));
    await db.query('insert into public.blocks values($1,$2)', [guest, host]);
    await assert.rejects(db.query('insert into public.blocks values($1,$2)', [host, guest]));
    await asUser(host);
    assert.equal((await db.query('select * from public.blocks')).rows.length, 0);
    await db.exec('reset role;');
    await db.query('insert into public.room_exclusions values($1,$2)', [room, guest]);
    await asUser(guest);
    assert.equal((await db.query('select * from public.messages')).rows.length, 0);
    await assert.rejects(send(randomUUID(), 'Exclu'));
  } finally {
    await db.close();
  }
});
