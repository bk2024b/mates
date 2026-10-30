import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { errorDiagnostic, diagnosticFetch } from '../src/lib/server/auth-diagnostics';
test('une erreur AuthUnknown conserve le type de cause mais jamais le message brut', () => {
  const result = errorDiagnostic({
    name: 'AuthUnknownError',
    message: 'private@example.com secret',
    originalError: new SyntaxError('Unexpected token secret'),
  });
  assert.equal(result.errorName, 'AuthUnknownError');
  assert.equal(result.reason, 'INVALID_JSON');
  assert.ok(!JSON.stringify(result).includes('secret'));
  assert.ok(!JSON.stringify(result).includes('@'));
});
test('une erreur réseau ou cookie a un diagnostic fixe sans valeur sensible', () => {
  assert.equal(
    errorDiagnostic({ name: 'TypeError', cause: { code: 'ENOTFOUND', message: 'private-url' } })
      .networkCode,
    'ENOTFOUND',
  );
  assert.equal(
    errorDiagnostic({
      name: 'AuthUnknownError',
      originalError: new Error('Cookies can only be modified in a Server Action'),
    }).reason,
    'COOKIE_CONTEXT',
  );
});
test('la réponse HTML est conservée pour le SDK et journalisée sans contenu ni URL', async () => {
  const warn = mock.method(console, 'warn', () => {});
  const fetchMock = mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response('<html>secret-token</html>', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      }),
  );
  try {
    const r = await diagnosticFetch('https://example.invalid/private-key');
    assert.equal(r.status, 404);
    assert.equal(await r.text(), '<html>secret-token</html>');
    const calls = JSON.stringify(warn.mock.calls.map((c) => c.arguments));
    assert.ok(calls.includes('html'));
    assert.ok(!calls.includes('secret-token'));
    assert.ok(!calls.includes('private-key'));
  } finally {
    warn.mock.restore();
    fetchMock.mock.restore();
  }
});

test('une réponse 204 réussie ne produit pas une fausse alerte', async () => {
  const warn = mock.method(console, 'warn', () => {});
  const fetchMock = mock.method(
    globalThis,
    'fetch',
    async () => new Response(null, { status: 204 }),
  );
  try {
    const r = await diagnosticFetch('https://example.invalid/rest/v1/profiles');
    assert.equal(r.status, 204);
    assert.equal(warn.mock.callCount(), 0);
  } finally {
    warn.mock.restore();
    fetchMock.mock.restore();
  }
});
