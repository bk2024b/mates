import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TrackSource } from 'livekit-server-sdk';
import { roomIdSchema } from '@/lib/contracts';
import { supabaseServer } from '@/lib/supabase/server';
import { failure, ApiError, validateMutation, readJson, rateLimit } from '@/lib/server/http';
import { roomService } from '@/lib/server/rooms';
import {
  controlDatabase,
  closeMedia,
  controlError,
  revokeScreens,
  screenSources,
} from '@/lib/server/room-controls';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const commandSchema = z.object({
  action: z.enum(['acquire', 'stop', 'presenter_add', 'presenter_remove', 'kick', 'close']),
  target: z.uuid().nullable().optional(),
  requestId: z.uuid(),
});
async function context(roomId: string) {
  roomIdSchema.parse(roomId);
  const client = await supabaseServer();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user)
    throw new ApiError(401, 'UNAUTHORIZED', 'Reconnecte-toi pour continuer.');
  const actor = auth.data.user.id;
  rateLimit(`controls:${actor}`, 90);
  const db = controlDatabase();
  const info = await db.from('rooms').select('controls_enabled').eq('id', roomId).maybeSingle();
  if (info.error)
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Impossible de vérifier le salon.');
  if (!info.data?.controls_enabled)
    throw new ApiError(
      409,
      'CONTROLS_DISABLED',
      'Les commandes ne sont pas activées dans ce salon.',
    );
  const member = await db
    .from('room_members')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', actor)
    .maybeSingle();
  const excluded = await db
    .from('room_exclusions')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', actor)
    .maybeSingle();
  if (member.error || excluded.error)
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Impossible de vérifier les permissions.');
  if (!member.data || excluded.data)
    throw new ApiError(403, 'CONTROL_DENIED', 'Tu n’as pas accès à ce salon.');
  return { db, actor };
}
export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const { db, actor } = await context(roomId);
    const room = await db
      .from('rooms')
      .select('host_id,status,stage_owner_id,stage_expires_at,control_lock,host_absent_since')
      .eq('id', roomId)
      .single();
    const presenters = await db.from('room_presenters').select('user_id').eq('room_id', roomId);
    if (room.error || presenters.error)
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Impossible de lire le salon.');
    const service = roomService();
    const live = room.data.status === 'open' ? await service.listParticipants(roomId) : [];
    if (room.data.status === 'open') {
      if (live.some((p) => p.identity === room.data.host_id)) {
        if (room.data.host_absent_since)
          await db.from('rooms').update({ host_absent_since: null }).eq('id', roomId);
      } else if (!room.data.host_absent_since) {
        await db
          .from('rooms')
          .update({ host_absent_since: new Date().toISOString() })
          .eq('id', roomId)
          .is('host_absent_since', null);
      } else if (Date.now() - Date.parse(room.data.host_absent_since) > 90_000) {
        const request = crypto.randomUUID();
        const begin = await db.rpc('begin_mates_control', {
          p_room_id: roomId,
          p_actor: room.data.host_id,
          p_action: 'close',
          p_target: null,
          p_request: request,
        });
        if (!begin.error && !begin.data.done) {
          await closeMedia(service, roomId, room.data.stage_owner_id);
          await db.rpc('finish_mates_control', { p_room_id: roomId, p_request: request });
          room.data.status = 'closed';
        }
      }
    }
    if (
      room.data.status === 'open' &&
      room.data.stage_owner_id &&
      !room.data.control_lock &&
      room.data.stage_expires_at &&
      Date.parse(room.data.stage_expires_at) < Date.now()
    ) {
      const connected = live;
      const owner = connected.find((p) => p.identity === room.data.stage_owner_id);
      if (!owner || !owner.tracks.some((t) => t.source === TrackSource.SCREEN_SHARE)) {
        const request = crypto.randomUUID();
        const begin = await db.rpc('begin_mates_control', {
          p_room_id: roomId,
          p_actor: room.data.host_id,
          p_action: 'stop',
          p_target: null,
          p_request: request,
        });
        if (!begin.error && !begin.data.done) {
          await revokeScreens(service, roomId, [room.data.stage_owner_id]);
          const finish = await db.rpc('finish_mates_control', {
            p_room_id: roomId,
            p_request: request,
          });
          if (!finish.error) room.data.stage_owner_id = null;
        }
      }
    }
    return NextResponse.json(
      {
        identity: actor,
        hostId: room.data.host_id,
        status: room.data.status,
        stageOwner: room.data.stage_owner_id,
        stageExpiresAt: room.data.stage_expires_at,
        busy: !!room.data.control_lock,
        presenters: presenters.data.map((p) => p.user_id),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    validateMutation(req);
    const input = commandSchema.parse(await readJson(req));
    const { roomId } = await params;
    const { db, actor } = await context(roomId);
    const service = roomService();
    const begun = await db.rpc('begin_mates_control', {
      p_room_id: roomId,
      p_actor: actor,
      p_action: input.action,
      p_target: input.target || null,
      p_request: input.requestId,
    });
    if (begun.error) throw controlError(begun.error.message);
    if (begun.data.done) return NextResponse.json({ ok: true });
    // Toute erreur après réservation laisse le verrou fermé : aucune nouvelle diffusion concurrente.
    if (input.action === 'close') {
      await closeMedia(service, roomId, begun.data.previousOwner || null);
    } else {
      const people = await service.listParticipants(roomId);
      if (input.action === 'acquire' || input.action === 'stop') {
        await revokeScreens(service, roomId, [
          ...new Set([
            ...people
              .filter(
                (p) =>
                  (input.action !== 'acquire' || p.identity !== actor) &&
                  (p.permission?.canPublishSources?.some(
                    (s) => s === TrackSource.SCREEN_SHARE || s === TrackSource.SCREEN_SHARE_AUDIO,
                  ) ||
                    p.tracks.some(
                      (t) =>
                        t.source === TrackSource.SCREEN_SHARE ||
                        t.source === TrackSource.SCREEN_SHARE_AUDIO,
                    )),
              )
              .map((p) => p.identity),
            ...(begun.data.previousOwner &&
            (input.action !== 'acquire' || begun.data.previousOwner !== actor)
              ? [begun.data.previousOwner]
              : []),
          ]),
        ]);
        if (input.action === 'acquire') {
          const still = await db
            .from('rooms')
            .select('status,control_lock')
            .eq('id', roomId)
            .single();
          if (
            still.error ||
            still.data.status !== 'open' ||
            still.data.control_lock !== input.requestId
          )
            throw new ApiError(409, 'STALE_COMMAND', 'La commande a été annulée.');
          await service.updateParticipant(roomId, actor, {
            permission: {
              canPublish: true,
              canSubscribe: true,
              canPublishData: false,
              canPublishSources: screenSources,
            },
          });
        }
      }
      if (input.action === 'presenter_remove' || input.action === 'kick') {
        // Même hors ligne, une identité exclue doit perdre ses anciens jetons.
        await revokeScreens(service, roomId, [input.target!]);
      }
    }
    const done = await db.rpc('finish_mates_control', {
      p_room_id: roomId,
      p_request: input.requestId,
    });
    if (done.error)
      throw new ApiError(
        503,
        'CONTROL_UNCONFIRMED',
        'La commande média n’a pas pu être confirmée. L’hôte peut fermer le salon.',
      );
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return failure(e);
  }
}
