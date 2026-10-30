import { DataPacket_Kind } from 'livekit-server-sdk';
import { supabaseServer } from '../supabase/server';
import { CHAT_TOPIC, type ChatEvent } from '../chat';
import { findRoom, metadata, roomService } from './rooms';
import { ApiError, rateLimit } from './http';
export async function chatContext(roomId: string) {
  const room = await findRoom(roomId);
  if (!metadata(room).chat)
    throw new ApiError(409, 'CHAT_DISABLED', 'Le chat n’est pas activé dans ce salon.');
  const client = await supabaseServer();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    throw new ApiError(401, 'UNAUTHORIZED', 'Reconnecte-toi pour continuer.');
  rateLimit(`chat-api:${data.user.id}`, 150);
  const access = await client.rpc('can_read_mates_chat', { p_room_id: roomId });
  if (access.error)
    throw new ApiError(503, 'CHAT_NOT_CONFIGURED', 'La migration du chat doit être appliquée.');
  if (!access.data)
    throw new ApiError(403, 'CHAT_ACCESS_DENIED', 'Tu n’as plus accès au chat de ce salon.');
  return { client, user: data.user };
}
export function chatDatabaseError(message: string) {
  if (message.includes('chat_rate_limited'))
    return new ApiError(
      429,
      'CHAT_RATE_LIMITED',
      'Tu envoies trop vite. Patiente quelques secondes.',
    );
  if (message.includes('chat_access_denied'))
    return new ApiError(403, 'CHAT_ACCESS_DENIED', 'Tu n’as plus accès à ce chat.');
  return new ApiError(503, 'CHAT_UNAVAILABLE', 'Le message n’a pas pu être enregistré. Réessaie.');
}
export async function broadcastChat(roomId: string, event: ChatEvent) {
  try {
    await roomService().sendData(
      roomId,
      new TextEncoder().encode(JSON.stringify(event)),
      DataPacket_Kind.RELIABLE,
      { topic: CHAT_TOPIC },
    );
    return true;
  } catch {
    console.warn('[mates:chat]', { code: 'BROADCAST_FAILED' });
    return false;
  }
}
