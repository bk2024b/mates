import { z } from 'zod';
export const REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '🤯'] as const;
export const CHAT_TOPIC = 'mates.chat.v1';
export const chatMessageSchema = z.object({
  seq: z.number().int().positive().safe(),
  id: z.uuid(),
  room_id: z.string(),
  author_id: z.uuid(),
  nickname: z.string().min(2).max(28),
  client_message_id: z.uuid(),
  body: z.string().min(1).max(1000),
  created_at: z.iso.datetime({ offset: true }),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export const chatEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('message'), roomId: z.string(), message: chatMessageSchema }),
  z.object({
    type: z.literal('reaction'),
    roomId: z.string(),
    id: z.uuid(),
    authorId: z.uuid(),
    emoji: z.enum(REACTIONS),
    createdAt: z.iso.datetime({ offset: true }),
  }),
]);
export type ChatEvent = z.infer<typeof chatEventSchema>;
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[], limit = 500) {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.seq - b.seq).slice(-limit);
}
export function decodeChatPacket(
  payload: Uint8Array,
  roomId: string,
  hasParticipant: boolean,
): ChatEvent | null {
  if (hasParticipant || payload.byteLength > 12_000) return null;
  try {
    const result = chatEventSchema.safeParse(JSON.parse(new TextDecoder().decode(payload)));
    if (!result.success || result.data.roomId !== roomId) return null;
    if (result.data.type === 'message' && result.data.message.room_id !== roomId) return null;
    return result.data;
  } catch {
    return null;
  }
}
