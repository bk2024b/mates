import { AccessToken, RoomServiceClient, TrackSource, type Room } from 'livekit-server-sdk';
import type { JoinInfo, RoomInfo } from '../contracts';
import { livekitConfig } from './config';
import { ApiError } from './http';
export type RoomMetadata = {
  app: 'mates';
  version: 1;
  identityMode?: 'prototype' | 'supabase';
  controls?: boolean;
  chat?: boolean;
  visibility?: 'public' | 'link';
  title: string;
  hostIdentity: string;
  createdAt: string;
};
export function roomService() {
  const c = livekitConfig();
  return new RoomServiceClient(c.url.replace(/^ws/, 'http'), c.key, c.secret);
}
export function metadata(room: Pick<Room, 'metadata'>): RoomMetadata {
  try {
    const m = JSON.parse(room.metadata) as RoomMetadata;
    if (
      m.app === 'mates' &&
      m.version === 1 &&
      typeof m.title === 'string' &&
      typeof m.hostIdentity === 'string' &&
      (m.visibility === undefined || m.visibility === 'public' || m.visibility === 'link') &&
      (m.chat === undefined || typeof m.chat === 'boolean') &&
      (m.controls === undefined || typeof m.controls === 'boolean') &&
      (m.identityMode === undefined ||
        m.identityMode === 'prototype' ||
        m.identityMode === 'supabase')
    )
      return m;
  } catch {
    /* malformed or foreign room */
  }
  throw new ApiError(404, 'ROOM_NOT_FOUND', 'Ce salon est introuvable ou a expiré.');
}
export function publicRoom(room: Room): RoomInfo {
  const m = metadata(room);
  return {
    id: room.name,
    title: m.title,
    participants: room.numParticipants,
    maxParticipants: room.maxParticipants,
    createdAt: m.createdAt,
    visibility: m.visibility || 'link',
  };
}
export async function findRoom(id: string) {
  const rooms = await roomService().listRooms([id]);
  const room = rooms.find((r) => r.name === id);
  if (!room) throw new ApiError(404, 'ROOM_NOT_FOUND', 'Ce salon est introuvable ou a expiré.');
  metadata(room);
  return room;
}
export async function joinToken(room: Room, identity: string, name: string): Promise<JoinInfo> {
  const config = livekitConfig();
  const role = metadata(room).hostIdentity === identity ? 'host' : 'guest';
  const token = new AccessToken(config.key, config.secret, {
    identity,
    name,
    ttl: '10m',
    metadata: JSON.stringify({ app: 'mates', role }),
  });
  token.addGrant({
    roomJoin: true,
    room: room.name,
    canSubscribe: true,
    canPublish: true,
    canPublishData: false,
    canUpdateOwnMetadata: false,
    canPublishSources:
      role === 'host' && !metadata(room).controls
        ? [
            TrackSource.MICROPHONE,
            TrackSource.CAMERA,
            TrackSource.SCREEN_SHARE,
            TrackSource.SCREEN_SHARE_AUDIO,
          ]
        : [TrackSource.MICROPHONE, TrackSource.CAMERA],
  });
  return {
    token: await token.toJwt(),
    serverUrl: config.url,
    identity,
    role,
    controls: !!metadata(room).controls,
    chat: !!metadata(room).chat,
    room: publicRoom(room),
  };
}
