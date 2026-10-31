import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureOptions } from '../src/lib/media';
import { createRoomSchema } from '../src/lib/contracts';
import { metadata } from '../src/lib/server/rooms';
test('le partage suggère la source choisie et demande le son pour les deux parcours', () => {
  assert.deepEqual(captureOptions('motion').video, { displaySurface: 'browser' });
  const application = captureOptions('motion', 'application');
  assert.deepEqual(application.video, { displaySurface: 'window' });
  assert.equal(application.systemAudio, 'include');
  assert.equal(typeof application.audio, 'object');
});
test('les paramètres cinéma sont bornés et les anciennes salles restent valides', () => {
  const input = createRoomSchema.parse({ name: 'Panda', title: 'Notre séance', kind: 'cinema' });
  assert.equal(input.visibility, 'link');
  assert.equal(input.description, '');
  assert.equal(
    createRoomSchema.safeParse({ ...input, description: 'x'.repeat(241) }).success,
    false,
  );
  const base = { app: 'mates', version: 1, title: 'Un salon', hostIdentity: 'host' };
  assert.ok(metadata({ metadata: JSON.stringify(base) }));
  assert.throws(() =>
    metadata({
      metadata: JSON.stringify({ ...base, cinema: { phase: 'admin', description: '' } }),
    }),
  );
});
