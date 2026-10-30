import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { validateMutation, rateLimit, ApiError } from '../src/lib/server/http';
process.env.APP_ORIGIN = 'http://localhost:3000';
test('une mutation issue d’un site tiers est refusée', () => {
  assert.throws(
    () =>
      validateMutation(
        new NextRequest('http://localhost:3000/api/rooms', {
          method: 'POST',
          headers: { origin: 'https://evil.invalid', 'content-type': 'application/json' },
        }),
      ),
    (e: unknown) => e instanceof ApiError && e.status === 403,
  );
});
test('une mutation même origine en JSON est acceptée', () => {
  assert.doesNotThrow(() =>
    validateMutation(
      new NextRequest('http://localhost:3000/api/rooms', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      }),
    ),
  );
});
test('le limiteur bloque puis réouvre à expiration', () => {
  const k = crypto.randomUUID();
  rateLimit(k, 1, 100, 0);
  assert.throws(() => rateLimit(k, 1, 100, 50));
  assert.doesNotThrow(() => rateLimit(k, 1, 100, 101));
});
