import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { roomIdSchema } from '@/lib/contracts';
import { findRoom, metadata, publicRoom, roomService } from '@/lib/server/rooms';
import { readSession, COOKIE_NAME } from '@/lib/server/session';
import { supabaseServer } from '@/lib/supabase/server';
import { ApiError, failure, readJson, validateMutation, rateLimit } from '@/lib/server/http';
export const runtime = 'nodejs';
export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    validateMutation(req);
    const roomId = roomIdSchema.parse((await params).roomId);
    const input = z
      .union([
        z.object({ phase: z.enum(['foyer', 'discussion']) }).strict(),
        z.object({ ready: z.boolean() }).strict(),
      ])
      .parse(await readJson(req));
    const room = await findRoom(roomId),
      meta = metadata(room);
    if (!meta.cinema)
      throw new ApiError(409, 'NOT_CINEMA', 'Ce salon n’est pas une séance cinéma.');
    let actor: string | undefined;
    if (meta.identityMode === 'supabase') {
      const client = await supabaseServer();
      const auth = await client.auth.getUser();
      if (!auth.error) actor = auth.data.user?.id;
    } else actor = readSession(req.cookies.get(COOKIE_NAME)?.value)?.id;
    if (!actor) throw new ApiError(401, 'UNAUTHORIZED', 'Reconnecte-toi pour continuer.');
    if ('phase' in input && actor !== meta.hostIdentity)
      throw new ApiError(
        403,
        'CINEMA_HOST_ONLY',
        'Seul l’hôte peut changer l’ambiance de la séance.',
      );
    rateLimit('cinema:' + actor, 30);
    await roomService().getParticipant(roomId, actor);
    if ('ready' in input) {
      await roomService().updateParticipant(roomId, actor, {
        metadata: JSON.stringify({
          app: 'mates',
          role: actor === meta.hostIdentity ? 'host' : 'guest',
          cinemaReady: input.ready,
        }),
      });
      return NextResponse.json(
        { ready: input.ready },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const updated = await roomService().updateRoomMetadata(
      roomId,
      JSON.stringify({ ...meta, cinema: { ...meta.cinema, phase: input.phase } }),
    );
    return NextResponse.json(publicRoom(updated), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return failure(e);
  }
}
