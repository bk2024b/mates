import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrackSource, type RoomServiceClient, type ParticipantInfo } from 'livekit-server-sdk';
import { revokeScreens } from '../src/lib/server/room-controls';
test('la nouvelle scène ne peut pas être accordée avant la disparition des anciennes pistes', async () => {
  const calls: string[] = [];
  let polls = 0;
  const service = {
    async removeParticipant() {
      calls.push('revoke');
    },
    async listParticipants() {
      calls.push('verify');
      return ++polls === 1
        ? [{ identity: 'old', tracks: [{ source: TrackSource.SCREEN_SHARE }] }]
        : [];
    },
  };
  await revokeScreens(service as unknown as RoomServiceClient, 'room', ['old']);
  assert.deepEqual(calls, ['revoke', 'verify', 'verify']);
});
test('un échec de révocation interrompt immédiatement le transfert', async () => {
  let reads = 0;
  const service = {
    async removeParticipant() {
      throw new Error('unavailable');
    },
    async listParticipants() {
      reads++;
      return [];
    },
  };
  await assert.rejects(revokeScreens(service as unknown as RoomServiceClient, 'room', ['old']));
  assert.equal(reads, 0);
});
