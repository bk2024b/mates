import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { authFailure } from '../src/lib/server/auth-errors';
test('les refus de configuration email et de quota reçoivent des diagnostics distincts', () => {
  const log = mock.method(console, 'warn', () => {});
  try {
    const mail = authFailure({ code: 'email_address_not_authorized', status: 400 }, 'signup');
    assert.equal(mail.code, 'AUTH_EMAIL_ADDRESS_NOT_AUTHORIZED');
    assert.equal(mail.status, 503);
    assert.match(mail.message, /service email/);
    const limit = authFailure({ code: 'over_email_send_rate_limit', status: 429 }, 'signup');
    assert.equal(limit.status, 429);
    assert.match(limit.message, /limite/i);
  } finally {
    log.mock.restore();
  }
});
test('une erreur inconnue ne divulgue jamais de détail fournisseur ni de donnée utilisateur', () => {
  const log = mock.method(console, 'warn', () => {});
  try {
    const error = {
      code: 'bad-code-with-secret@example.com',
      status: 500,
      message: 'secret-token et private@example.com',
    };
    const result = authFailure(error, 'signup');
    assert.equal(result.code, 'AUTH_PROVIDER_ERROR');
    assert.ok(!JSON.stringify(log.mock.calls).includes('secret-token'));
    assert.ok(!JSON.stringify(log.mock.calls).includes('private@example.com'));
    assert.ok(!JSON.stringify(log.mock.calls).includes('secret@example.com'));
    assert.ok(!result.message.includes('secret'));
  } finally {
    log.mock.restore();
  }
});
test('les comptes existants conservent un message neutre', () => {
  const log = mock.method(console, 'warn', () => {});
  try {
    assert.equal(
      authFailure({ code: 'email_exists' }, 'signup').message,
      authFailure({ code: 'user_already_exists' }, 'signup').message,
    );
  } finally {
    log.mock.restore();
  }
});
