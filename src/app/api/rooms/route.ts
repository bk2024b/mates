import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { ROOM_CAPACITY } from '@/lib/limits';
import { createRoomSchema } from '@/lib/contracts';
import { ApiError, failure, readJson, rateLimit, validateMutation } from '@/lib/server/http';
import { resolveIdentity, applyIdentityCookie, persistRoom, enroll } from '@/lib/server/identity';
import { roomService, type RoomMetadata } from '@/lib/server/rooms';
import {
  controlsEnabled,
  controlDatabase,
  controlDatabaseFailure,
} from '@/lib/server/room-controls';
import { configuration } from '@/lib/server/config';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    validateMutation(req);
    if (!configuration().configured)
      throw new ApiError(
        503,
        'NOT_CONFIGURED',
        'Configure LiveKit et APP_SESSION_SECRET dans .env.local pour créer un salon.',
      );
    const input = createRoomSchema.parse(await readJson(req));
    rateLimit('create:global', 30);
    const identity = await resolveIdentity(req, input.name, 'create');
    rateLimit(`create:${identity.id}`, 5);
    // Limiteur de confort ; prévoir un quota distribué avant ouverture publique.
    const id = `mates-${randomBytes(12).toString('hex')}`;
    const meta: RoomMetadata = {
      app: 'mates',
      version: 1,
      title: input.title,
      visibility: input.visibility,
      hostIdentity: identity.id,
      createdAt: new Date().toISOString(),
      identityMode: identity.mode,
      controls: identity.mode === 'supabase' && controlsEnabled(),
      chat: identity.mode === 'supabase' && process.env.MATES_CHAT === 'enabled',
    };
    await persistRoom(identity, id, input.title);
    try {
      if (meta.controls || meta.chat) {
        const configured = await controlDatabase()
          .from('rooms')
          .update({
            ...(meta.controls ? { controls_enabled: true } : {}),
            ...(meta.chat ? { chat_enabled: true } : {}),
          })
          .eq('id', id);
        if (configured.error) throw controlDatabaseFailure(configured);
      }
      await roomService().createRoom({
        name: id,
        maxParticipants: ROOM_CAPACITY,
        emptyTimeout: 600,
        departureTimeout: 120,
        metadata: JSON.stringify(meta),
      });
      await enroll(identity, id, identity.id);
    } catch (error) {
      // Compensation uniquement du salon qui vient d’être créé.
      await roomService()
        .deleteRoom(id)
        .catch(() => {});
      if (identity.client) await identity.client.from('rooms').delete().eq('id', id);
      throw error;
    }
    const response = NextResponse.json(
      { id },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
    applyIdentityCookie(response, req, identity);
    return response;
  } catch (e) {
    return failure(e);
  }
}
