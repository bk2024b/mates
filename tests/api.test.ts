import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { RoomServiceClient, type Room } from 'livekit-server-sdk';
import { POST as createRoom } from '../src/app/api/rooms/route';
import { POST as joinRoom } from '../src/app/api/rooms/[roomId]/join/route';
import { GET as getRoom } from '../src/app/api/rooms/[roomId]/route';
process.env.APP_SESSION_SECRET = 'api-test-only-secret-with-more-than-32-characters';
process.env.APP_ORIGIN = 'http://localhost:3000';
process.env.LIVEKIT_URL = 'wss://api-test.livekit.cloud';
process.env.LIVEKIT_API_KEY = 'test-key';
process.env.LIVEKIT_API_SECRET = 'test-secret-longer-than-32-characters';
function request(path: string, body: unknown, cookie?: string) {
  return new NextRequest('http://localhost:3000' + path, {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}
test('parcours API créer puis rejoindre comme hôte et comme invité avec fournisseur simulé', async () => {
  const rooms = new Map<string, Room>();
  const create = mock.method(
    RoomServiceClient.prototype,
    'createRoom',
    async (options: { name: string; metadata: string; maxParticipants: number }) => {
      const r = {
        name: options.name,
        metadata: options.metadata,
        maxParticipants: options.maxParticipants,
        numParticipants: 0,
      } as Room;
      rooms.set(r.name, r);
      return r;
    },
  );
  const list = mock.method(RoomServiceClient.prototype, 'listRooms', async (names: string[]) =>
    names.flatMap((n) => (rooms.has(n) ? [rooms.get(n)!] : [])),
  );
  try {
    const made = await createRoom(
      request('/api/rooms', { name: 'Panda', title: 'Les robots de demain' }),
    );
    assert.equal(made.status, 201);
    const { id } = await made.json();
    assert.match(id, /^mates-[a-f0-9]{24}$/);
    assert.equal(rooms.get(id)!.maxParticipants, 50);
    const cookie = made.headers.get('set-cookie')!.split(';')[0];
    assert.match(made.headers.get('set-cookie')!, /HttpOnly/);
    assert.match(made.headers.get('set-cookie')!, /SameSite=strict/i);
    const host = await joinRoom(request(`/api/rooms/${id}/join`, { name: 'Panda' }, cookie), {
      params: Promise.resolve({ roomId: id }),
    });
    assert.equal(host.status, 200);
    assert.equal((await host.json()).role, 'host');
    const guest = await joinRoom(request(`/api/rooms/${id}/join`, { name: 'Hôte' }), {
      params: Promise.resolve({ roomId: id }),
    });
    assert.equal(guest.status, 200);
    assert.equal((await guest.json()).role, 'guest');
    const found = await getRoom(new NextRequest(`http://localhost:3000/api/rooms/${id}`), {
      params: Promise.resolve({ roomId: id }),
    });
    assert.equal(found.status, 200);
    assert.equal((await found.json()).title, 'Les robots de demain');
    rooms.get(id)!.numParticipants = 49;
    const lastSeat = await joinRoom(request(`/api/rooms/${id}/join`, { name: 'Dernier mate' }), {
      params: Promise.resolve({ roomId: id }),
    });
    assert.equal(lastSeat.status, 200);
    rooms.get(id)!.numParticipants = 50;
    const full = await joinRoom(request(`/api/rooms/${id}/join`, { name: 'Mate' }), {
      params: Promise.resolve({ roomId: id }),
    });
    assert.equal(full.status, 409);
    assert.equal((await full.json()).error.code, 'ROOM_FULL');
  } finally {
    create.mock.restore();
    list.mock.restore();
  }
});
test('la création non configurée échoue sans émettre de jeton', async () => {
  const key = process.env.LIVEKIT_API_KEY;
  delete process.env.LIVEKIT_API_KEY;
  try {
    const r = await createRoom(request('/api/rooms', { name: 'Panda', title: 'Un sujet' }));
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error.code, 'NOT_CONFIGURED');
  } finally {
    process.env.LIVEKIT_API_KEY = key;
  }
});
