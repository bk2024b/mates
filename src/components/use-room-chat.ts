'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  type RemoteParticipant,
  type DataPacket_Kind,
  type Encryption_Type,
} from 'livekit-client';
import { api } from '@/lib/api';
import {
  CHAT_TOPIC,
  decodeChatPacket,
  mergeMessages,
  type ChatMessage,
  type ChatEvent,
} from '@/lib/chat';
import type { JoinInfo } from '@/lib/contracts';
type History = { messages: ChatMessage[]; hasMore: boolean; blocks: string[] };
export function useRoomChat(session: JoinInfo, room: Room, active: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [blocked, setBlocked] = useState(new Set<string>());
  const [reactions, setReactions] = useState<Extract<ChatEvent, { type: 'reaction' }>[]>([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasOlder, setHasOlder] = useState(false);
  const [unread, setUnread] = useState(0);
  const activeRef = useRef(active),
    blockedRef = useRef(blocked),
    seen = useRef(new Set<string>()),
    cursor = useRef<number | null>(null),
    reactionIds = useRef(new Set<string>()),
    retry = useRef<{ id: string; text: string } | null>(null);
  activeRef.current = active;
  blockedRef.current = blocked;
  const blockVersion = useRef(0);
  const path = `/api/rooms/${session.room.id}/chat`;
  const ingest = useCallback(
    (incoming: ChatMessage[], notify = true) => {
      let count = 0;
      for (const m of incoming)
        if (!seen.current.has(m.id)) {
          seen.current.add(m.id);
          if (m.author_id !== session.identity && !blockedRef.current.has(m.author_id)) count++;
        }
      if (notify && !activeRef.current) setUnread((v) => Math.min(99, v + count));
      setMessages((v) => mergeMessages(v, incoming));
    },
    [session.identity],
  );
  const ingestReaction = useCallback((event: Extract<ChatEvent, { type: 'reaction' }>) => {
    if (
      reactionIds.current.has(event.id) ||
      blockedRef.current.has(event.authorId) ||
      Date.now() - Date.parse(event.createdAt) > 10_000
    )
      return;
    reactionIds.current.add(event.id);
    setReactions((v) => [...v.slice(-19), event]);
  }, []);
  useEffect(() => {
    if (active) setUnread(0);
  }, [active]);
  useEffect(() => {
    if (!session.chat) {
      setLoading(false);
      return;
    }
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function sync() {
      try {
        let pages = 0;
        let more = true;
        while (more && pages++ < 5 && !disposed) {
          const first = cursor.current === null;
          const requestedBlockVersion = blockVersion.current;
          const data = await api<History>(path + (first ? '' : `?after=${cursor.current}`));
          if (disposed) return;
          if (blockVersion.current === requestedBlockVersion) {
            blockedRef.current = new Set(data.blocks);
            setBlocked(blockedRef.current);
          }
          ingest(data.messages, !first);
          if (first) setHasOlder(data.hasMore);
          if (data.messages.length) cursor.current = data.messages.at(-1)!.seq;
          else if (first) cursor.current = 0;
          more = !first && data.hasMore;
        }
        if (!disposed) setError('');
      } catch (e) {
        if (!disposed) setError(e instanceof Error ? e.message : 'Impossible de lire le chat.');
      } finally {
        if (!disposed) {
          setLoading(false);
          timer = setTimeout(sync, 8000);
        }
      }
    }
    const received = (
      data: Uint8Array,
      participant: RemoteParticipant | undefined,
      _kind?: DataPacket_Kind,
      topic?: string,
      _encryption?: Encryption_Type,
      participantIdentity?: string,
    ) => {
      if (topic !== CHAT_TOPIC) return;
      const event = decodeChatPacket(data, session.room.id, !!participant || !!participantIdentity);
      if (!event) return;
      if (event.type === 'message') ingest([event.message]);
      else ingestReaction(event);
    };
    room.on(RoomEvent.DataReceived, received);
    void sync();
    const clean = setInterval(() => {
      setReactions((v) => v.filter((e) => Date.now() - Date.parse(e.createdAt) < 4500));
    }, 500);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearInterval(clean);
      room.off(RoomEvent.DataReceived, received);
    };
  }, [path, session.chat, session.room.id, room, ingest, ingestReaction]);
  async function send(text: string) {
    if (sending) return false;
    setSending(true);
    setError('');
    try {
      if (retry.current?.text !== text) retry.current = { id: crypto.randomUUID(), text };
      const result = await api<{ message: ChatMessage; liveDelivery: boolean }>(path, {
        kind: 'message',
        clientId: retry.current.id,
        body: text,
      });
      ingest([result.message], false);
      retry.current = null;
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le message n’a pas été envoyé.');
      return false;
    } finally {
      setSending(false);
    }
  }
  async function react(emoji: string) {
    setError('');
    try {
      const result = await api<{ event: Extract<ChatEvent, { type: 'reaction' }> }>(path, {
        kind: 'reaction',
        id: crypto.randomUUID(),
        emoji,
      });
      ingestReaction(result.event);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La réaction n’a pas été envoyée.');
    }
  }
  async function toggleBlock(id: string) {
    try {
      const shouldBlock = !blockedRef.current.has(id);
      await api(path, { kind: 'block', target: id, blocked: shouldBlock });
      const next = new Set(blockedRef.current);
      blockVersion.current++;
      if (shouldBlock) next.add(id);
      else next.delete(id);
      blockedRef.current = next;
      setBlocked(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Blocage indisponible.');
    }
  }
  async function older() {
    if (!messages.length || !hasOlder) return;
    if (messages.length >= 500) {
      setHasOlder(false);
      return;
    }
    try {
      const data = await api<History>(`${path}?before=${messages[0].seq}`);
      ingest(data.messages, false);
      setHasOlder(data.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Historique indisponible.');
    }
  }
  return {
    messages: messages.filter((m) => !blocked.has(m.author_id)),
    blocked,
    reactions: reactions.filter((r) => !blocked.has(r.authorId)),
    error,
    sending,
    loading,
    hasOlder,
    unread,
    send,
    react,
    toggleBlock,
    older,
  };
}
