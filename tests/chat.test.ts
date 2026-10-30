import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { decodeChatPacket, mergeMessages, type ChatMessage } from '../src/lib/chat';
function message(seq: number): ChatMessage {
  return {
    seq,
    id: randomUUID(),
    author_id: randomUUID(),
    room_id: 'room',
    nickname: 'Panda',
    client_message_id: randomUUID(),
    body: 'Salut',
    created_at: new Date().toISOString(),
  };
}
test('les messages désordonnés sont triés et les doublons supprimés', () => {
  const a = message(1),
    b = message(2);
  assert.deepEqual(
    mergeMessages([b], [a, b]).map((m) => m.seq),
    [1, 2],
  );
});
test('les paquets provenant d’un participant et d’un autre salon sont refusés', () => {
  const packet = new TextEncoder().encode(
    JSON.stringify({ type: 'message', roomId: 'room', message: message(1) }),
  );
  assert.equal(decodeChatPacket(packet, 'room', true), null);
  assert.equal(decodeChatPacket(packet, 'other', false), null);
  assert.ok(decodeChatPacket(packet, 'room', false));
  assert.equal(decodeChatPacket(new Uint8Array(13000), 'room', false), null);
});
