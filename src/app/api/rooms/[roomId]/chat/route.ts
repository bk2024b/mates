import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { roomIdSchema } from '@/lib/contracts';
import { REACTIONS, chatMessageSchema } from '@/lib/chat';
import { chatContext, chatDatabaseError, broadcastChat } from '@/lib/server/chat';
import { roomService } from '@/lib/server/rooms';
import { ApiError, failure, readJson, validateMutation } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const bodySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('message'),
    clientId: z.uuid(),
    body: z.string().trim().min(1).max(1000),
  }),
  z.object({ kind: z.literal('reaction'), id: z.uuid(), emoji: z.enum(REACTIONS) }),
  z.object({ kind: z.literal('block'), target: z.uuid(), blocked: z.boolean() }),
]);
const cursorSchema = z
  .string()
  .regex(/^\d{1,15}$/)
  .transform(Number)
  .refine(Number.isSafeInteger);
export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const roomId = roomIdSchema.parse((await params).roomId);
    const { client, user } = await chatContext(roomId);
    const after = req.nextUrl.searchParams.get('after'),
      before = req.nextUrl.searchParams.get('before');
    if (after && before)
      throw new ApiError(400, 'INVALID_CURSOR', 'Choisis un seul sens de lecture.');
    let query = client
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('seq', { ascending: !!after })
      .limit(51);
    if (after) query = query.gt('seq', cursorSchema.parse(after));
    if (before) query = query.lt('seq', cursorSchema.parse(before));
    const result = await query;
    const blocks = await client.from('blocks').select('blocked_id').eq('blocker_id', user.id);
    if (result.error || blocks.error)
      throw new ApiError(503, 'CHAT_UNAVAILABLE', 'Impossible de lire la conversation.');
    const messages = z.array(chatMessageSchema).parse(result.data.slice(0, 50));
    if (!after) messages.reverse();
    return NextResponse.json(
      { messages, hasMore: result.data.length > 50, blocks: blocks.data.map((b) => b.blocked_id) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    validateMutation(req);
    const input = bodySchema.parse(await readJson(req));
    const roomId = roomIdSchema.parse((await params).roomId);
    const { client, user } = await chatContext(roomId);
    let participant;
    try {
      participant = await roomService().getParticipant(roomId, user.id);
    } catch {
      throw new ApiError(403, 'CHAT_NOT_PRESENT', 'Rejoins le salon pour participer.');
    }
    if (input.kind === 'block') {
      if (input.target === user.id)
        throw new ApiError(400, 'INVALID_TARGET', 'Tu ne peux pas te bloquer toi-même.');
      const result = input.blocked
        ? await client
            .from('blocks')
            .upsert(
              { blocker_id: user.id, blocked_id: input.target },
              { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
            )
        : await client
            .from('blocks')
            .delete()
            .eq('blocker_id', user.id)
            .eq('blocked_id', input.target);
      if (result.error)
        throw new ApiError(503, 'BLOCK_FAILED', 'Le blocage n’a pas pu être enregistré.');
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (input.kind === 'message') {
      const result = await client.rpc('send_mates_message', {
        p_room_id: roomId,
        p_client_id: input.clientId,
        p_body: input.body,
      });
      if (result.error) throw chatDatabaseError(result.error.message);
      const message = chatMessageSchema.parse(result.data);
      const liveDelivery = await broadcastChat(roomId, { type: 'message', roomId, message });
      return NextResponse.json(
        { message, liveDelivery },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const result = await client.rpc('send_mates_reaction', {
      p_room_id: roomId,
      p_emoji: input.emoji,
    });
    if (result.error) throw chatDatabaseError(result.error.message);
    const event = {
      type: 'reaction' as const,
      roomId,
      id: input.id,
      authorId: user.id,
      emoji: input.emoji,
      createdAt: new Date().toISOString(),
    };
    const liveDelivery = await broadcastChat(roomId, event);
    return NextResponse.json({ event, liveDelivery }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return failure(e);
  }
}
