import type { Room } from 'livekit-server-sdk';
import { metadata, publicRoom, roomService } from './rooms';
import { roomIdSchema, type RoomInfo } from '../contracts';

// Explicit opt-in only: old rooms and foreign LiveKit rooms stay unlisted.
export function discoverableRooms(rooms: Room[]): RoomInfo[] {
  const visible: RoomInfo[] = [];
  for (const room of rooms) {
    try {
      const meta = metadata(room);
      if (
        meta.visibility !== 'public' ||
        room.numParticipants < 1 ||
        !roomIdSchema.safeParse(room.name).success ||
        meta.title.length > 80 ||
        meta.title.trim().length < 3 ||
        !Number.isFinite(Date.parse(meta.createdAt))
      )
        continue;
      visible.push(publicRoom(room));
    } catch {
      /* Ignore unrelated or invalid rooms without leaking metadata. */
    }
  }
  return visible.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 200);
}
let cached: { expires: number; rooms: RoomInfo[] } | undefined;
let pending: Promise<RoomInfo[]> | undefined;
export async function discoverRooms() {
  if (cached && cached.expires > Date.now()) return cached.rooms;
  if (pending) return pending;
  pending = roomService()
    .listRooms()
    .then((rooms) => {
      const result = discoverableRooms(rooms);
      cached = { expires: Date.now() + 5000, rooms: result };
      return result;
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
}
