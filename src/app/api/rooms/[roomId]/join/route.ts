import { NextRequest, NextResponse } from 'next/server';
import { joinRoomSchema, roomIdSchema } from '@/lib/contracts';
import { ApiError, failure, readJson, rateLimit, validateMutation } from '@/lib/server/http';
import { resolveIdentity, applyIdentityCookie, enroll } from '@/lib/server/identity';
import { findRoom, joinToken, metadata } from '@/lib/server/rooms';
export const runtime = 'nodejs';
export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    validateMutation(req);
    const id = roomIdSchema.parse((await params).roomId);
    const input = joinRoomSchema.parse(await readJson(req));
    rateLimit('join:global', 300);
    const room = await findRoom(id);
    if (room.numParticipants >= room.maxParticipants)
      throw new ApiError(409, 'ROOM_FULL', 'Ce salon est complet. Réessaie un peu plus tard.');
    const meta = metadata(room);
    const identity = await resolveIdentity(
      req,
      input.name,
      'join',
      meta.identityMode || 'prototype',
    );
    rateLimit(`join:${identity.id}`, 20);
    await enroll(identity, id, meta.hostIdentity);
    const response = NextResponse.json(await joinToken(room, identity.id, input.name), {
      headers: { 'Cache-Control': 'no-store' },
    });
    applyIdentityCookie(response, req, identity);
    return response;
  } catch (e) {
    return failure(e);
  }
}
