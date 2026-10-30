import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createRoomSchema } from '@/lib/contracts';
import { ApiError, failure, readJson, rateLimit, validateMutation } from '@/lib/server/http';
import {
  COOKIE_NAME,
  SESSION_SECONDS,
  newSession,
  readSession,
  signSession,
} from '@/lib/server/session';
import { roomService, type RoomMetadata } from '@/lib/server/rooms';
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
    const session = readSession(req.cookies.get(COOKIE_NAME)?.value) || newSession();
    rateLimit(`create:${session.id}`, 5);
    // Une identité invitée peut être renouvelée : ce plafond ne protège pas un lancement public.
    rateLimit('create:global', 30);
    const id = `mates-${randomBytes(12).toString('hex')}`;
    const meta: RoomMetadata = {
      app: 'mates',
      version: 1,
      title: input.title,
      hostIdentity: session.id,
      createdAt: new Date().toISOString(),
    };
    await roomService().createRoom({
      name: id,
      maxParticipants: 12,
      emptyTimeout: 600,
      departureTimeout: 120,
      metadata: JSON.stringify(meta),
    });
    const response = NextResponse.json(
      { id },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(COOKIE_NAME, signSession(session), {
      httpOnly: true,
      sameSite: 'strict',
      secure: req.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (e) {
    return failure(e);
  }
}
