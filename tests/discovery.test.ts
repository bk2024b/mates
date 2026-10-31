import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Room } from 'livekit-server-sdk';
import { discoverableRooms } from '../src/lib/server/discovery';
import { createRoomSchema } from '../src/lib/contracts';
function room(visibility?: string, participants = 2, extra = {}) {
  return {
    name: 'mates-' + 'a'.repeat(24),
    numParticipants: participants,
    maxParticipants: 12,
    metadata: JSON.stringify({
      app: 'mates',
      version: 1,
      title: 'Les robots',
      hostIdentity: 'secret-host-id',
      createdAt: '2026-10-31T10:00:00Z',
      visibility,
      ...extra,
    }),
  } as Room;
}
test('la découverte exige un choix public explicite et ne révèle aucune identité', () => {
  const result = discoverableRooms([
    room(),
    room('link'),
    room('public', 0),
    room('public', 2),
    room('public', 1, { app: 'other' }),
    room('public', 1, { createdAt: 'invalid' }),
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(
    Object.keys(result[0]).sort(),
    ['id', 'title', 'participants', 'maxParticipants', 'createdAt'].sort(),
  );
  assert.ok(!JSON.stringify(result).includes('secret-host-id'));
});
test('les anciens clients créent un salon non listé et les visibilités inconnues sont refusées', () => {
  assert.equal(createRoomSchema.parse({ name: 'Panda', title: 'Robotique' }).visibility, 'link');
  assert.equal(
    createRoomSchema.safeParse({ name: 'Panda', title: 'Robotique', visibility: 'secret' }).success,
    false,
  );
});
