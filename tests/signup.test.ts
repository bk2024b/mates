import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signupIsConnected } from '../src/lib/signup';
test('une inscription connectée exige une session et un compte permanent confirmé', () => {
  const user = { is_anonymous: false, email_confirmed_at: 'today' };
  assert.equal(signupIsConnected(user, true), true);
  assert.equal(signupIsConnected(user, false), false);
  assert.equal(signupIsConnected({ ...user, is_anonymous: true }, true), false);
  assert.equal(signupIsConnected({ ...user, email_confirmed_at: undefined }, true), false);
});
