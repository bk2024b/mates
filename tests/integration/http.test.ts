import { test } from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
test('la page d’accueil et le labo sont accessibles', async () => {
  for (const path of ['/', '/lab']) {
    const r = await fetch(base + path);
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.match(html, /mates/i);
  }
});
test('la santé ne divulgue jamais les secrets', async () => {
  const r = await fetch(base + '/api/health');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(typeof data.configured, 'boolean');
  assert.ok(Array.isArray(data.missing));
  assert.equal(data.LIVEKIT_API_SECRET, undefined);
});
test('une création cross-origin est refusée avant tout appel média', async () => {
  const r = await fetch(base + '/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.invalid' },
    body: JSON.stringify({ name: 'Panda', title: 'Robotique' }),
  });
  assert.equal(r.status, 403);
  assert.equal((await r.json()).error.code, 'ORIGIN_DENIED');
});
test('les identifiants de salon malformés sont rejetés', async () => {
  const r = await fetch(base + '/api/rooms/invalid');
  assert.equal(r.status, 400);
});
