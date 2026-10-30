import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identityMode, safeNext } from '../src/lib/identity-mode';
import { canCreate } from '../src/lib/server/identity';
test('un visiteur anonyme ou un compte non confirmé ne peut pas créer', () => {
  assert.equal(canCreate(null), false);
  assert.equal(canCreate({ is_anonymous: true, email_confirmed_at: 'today' }), false);
  assert.equal(canCreate({ is_anonymous: false, email_confirmed_at: undefined }), false);
  assert.equal(canCreate({ is_anonymous: false, email_confirmed_at: 'today' }), true);
});
test('le retour après authentification refuse les redirections externes', () => {
  for (const p of [
    'https://evil.invalid',
    '//evil.invalid',
    '/\\evil.invalid',
    '/api/rooms',
    'javascript:alert(1)',
  ])
    assert.equal(safeNext(p), '/');
  assert.equal(
    safeNext('/room/mates-123456789012345678901234'),
    '/room/mates-123456789012345678901234',
  );
});
test('le mode identité reste explicite et ne retombe pas silencieusement sur le prototype', () => {
  delete process.env.MATES_IDENTITY_MODE;
  assert.equal(identityMode(), 'prototype');
  process.env.MATES_IDENTITY_MODE = 'supabase';
  assert.equal(identityMode(), 'supabase');
  process.env.MATES_IDENTITY_MODE = 'typo';
  assert.throws(() => identityMode());
  delete process.env.MATES_IDENTITY_MODE;
});
