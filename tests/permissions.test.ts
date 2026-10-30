import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenVerifier, TrackSource, type Room } from 'livekit-server-sdk';
import { joinToken, metadata } from '../src/lib/server/rooms';
process.env.APP_SESSION_SECRET = 'unit-test-only-secret-with-more-than-32-characters';
process.env.LIVEKIT_URL = 'wss://unit-test.livekit.cloud';
process.env.LIVEKIT_API_KEY = 'test-key';
process.env.LIVEKIT_API_SECRET = 'test-secret-longer-than-32-characters';
process.env.APP_ORIGIN = 'http://localhost:3000';
const room = {
  name: 'mates-123456789012345678901234',
  metadata: JSON.stringify({
    app: 'mates',
    version: 1,
    hostIdentity: 'host-identity',
    title: 'Test',
    createdAt: '2026-10-30',
  }),
  maxParticipants: 12,
  numParticipants: 1,
} as Room;
const verifier = new TokenVerifier(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
test('le jeton invité ne permet jamais le partage écran ni les commandes admin', async () => {
  const data = await joinToken(room, 'guest-identity', 'Hôte autoproclamé');
  const token = await verifier.verify(data.token);
  assert.equal(data.role, 'guest');
  assert.equal(token.video?.room, room.name);
  assert.equal(token.video?.roomJoin, true);
  assert.equal(token.video?.roomAdmin, undefined);
  assert.equal(token.video?.canPublishData, false);
  assert.deepEqual(token.video?.canPublishSources, ['microphone', 'camera']);
  assert.equal(token.sub, 'guest-identity');
});
test('seul le propriétaire enregistré dans les métadonnées obtient les sources écran', async () => {
  const data = await joinToken(room, 'host-identity', 'Panda');
  const token = await verifier.verify(data.token);
  assert.equal(data.role, 'host');
  assert.ok((token.video?.canPublishSources as unknown as string[])?.includes('screen_share'));
  assert.ok(
    (token.video?.canPublishSources as unknown as string[])?.includes('screen_share_audio'),
  );
  assert.equal(token.video?.roomAdmin, undefined);
  assert.ok(Number(token.exp) - Number(token.nbf) <= 601);
});
test('une salle étrangère ou des métadonnées invalides sont refusées', () => {
  assert.throws(() => metadata({ metadata: '{}' }));
  assert.throws(() => metadata({ metadata: 'broken' }));
});

test('un salon contrôlé ne donne aucune source écran au jeton initial de l’hôte', async () => {
  const controlled = {
    ...room,
    metadata: JSON.stringify({ ...JSON.parse(room.metadata), controls: true }),
  } as Room;
  const data = await joinToken(controlled, 'host-identity', 'Panda');
  const token = await verifier.verify(data.token);
  assert.equal(data.controls, true);
  assert.deepEqual(token.video?.canPublishSources, ['microphone', 'camera']);
});
