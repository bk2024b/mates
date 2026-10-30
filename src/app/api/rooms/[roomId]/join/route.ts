import { NextRequest, NextResponse } from 'next/server';
import { joinRoomSchema, roomIdSchema } from '@/lib/contracts';
import { ApiError, failure, readJson, rateLimit, validateMutation } from '@/lib/server/http';
import {
  COOKIE_NAME,
  SESSION_SECONDS,
  newSession,
  readSession,
  signSession,
} from '@/lib/server/session';
import { findRoom, joinToken } from '@/lib/server/rooms';
export const runtime = 'nodejs';
export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    validateMutation(req);
    const id = roomIdSchema.parse((await params).roomId);
    const input = joinRoomSchema.parse(await readJson(req));
    const session = readSession(req.cookies.get(COOKIE_NAME)?.value) || newSession();
    rateLimit(`join:${session.id}`, 20);
    rateLimit('join:global', 300);
    const room = await findRoom(id);
    if (room.numParticipants >= room.maxParticipants)
      throw new ApiError(409, 'ROOM_FULL', 'Ce salon est complet. Réessaie un peu plus tard.');
    const response = NextResponse.json(await joinToken(room, session.id, input.name), {
      headers: { 'Cache-Control': 'no-store' },
    });
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
