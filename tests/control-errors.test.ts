import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { controlDatabaseFailure } from '../src/lib/server/room-controls';
test('un refus de clé et un schéma manquant ne reçoivent pas le même diagnostic', () => {
  const log = mock.method(console, 'warn', () => {});
  try {
    const key = controlDatabaseFailure({ status: 401, error: { code: 'PGRST301' } });
    assert.equal(key.code, 'CONTROL_KEY_REJECTED');
    assert.ok(!key.message.includes('migration'));
    assert.equal(
      controlDatabaseFailure({ status: 400, error: { code: 'PGRST204' } }).code,
      'CONTROL_MIGRATION_REQUIRED',
    );
    assert.equal(
      controlDatabaseFailure({ status: 403, error: { code: '42501' } }).code,
      'CONTROL_KEY_FORBIDDEN',
    );
  } finally {
    log.mock.restore();
  }
});
