import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newSession, readSession, signSession } from '../src/lib/server/session';
process.env.APP_SESSION_SECRET = 'unit-test-only-secret-with-more-than-32-characters';
test('une session signée conserve son identité opaque', () => {
  const s = newSession();
  assert.deepEqual(readSession(signSession(s)), s);
});
test('une identité modifiée ne peut pas récupérer le rôle hôte', () => {
  const s = newSession();
  const signed = signSession(s);
  const parts = signed.split('.');
  parts[0] = Buffer.from(
    JSON.stringify({ ...s, id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }),
  ).toString('base64url');
  assert.equal(readSession(parts.join('.')), null);
});
test('les sessions expirées et les MAC de taille incorrecte sont rejetés', () => {
  assert.equal(readSession(signSession({ ...newSession(), exp: 1 })), null);
  assert.equal(readSession('hello.short'), null);
  assert.equal(readSession('invalid'), null);
  assert.equal(readSession(undefined), null);
});
