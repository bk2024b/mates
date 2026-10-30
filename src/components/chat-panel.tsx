'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, MessageCircle, LoaderCircle } from 'lucide-react';
import type { ChatMessage } from '@/lib/chat';
export function ChatPanel({
  messages,
  identity,
  sending,
  loading,
  error,
  hasOlder,
  onOlder,
  onSend,
}: {
  messages: ChatMessage[];
  identity: string;
  sending: boolean;
  loading: boolean;
  error: string;
  hasOlder: boolean;
  onOlder: () => Promise<void>;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState('');
  const [newBelow, setNewBelow] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const previousLast = useRef<number | null>(null);
  useEffect(() => {
    const last = messages.at(-1)?.seq ?? null;
    if (last !== previousLast.current) {
      if (stick.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
      else setNewBelow(true);
    }
    previousLast.current = last;
  }, [messages]);
  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    stick.current = true;
    if (await onSend(text)) setDraft('');
  }
  return (
    <section className="chat-panel">
      <div
        className="chat-history"
        ref={scroll}
        onScroll={() => {
          const e = scroll.current;
          if (e) {
            stick.current = e.scrollHeight - e.scrollTop - e.clientHeight < 70;
            if (stick.current) setNewBelow(false);
          }
        }}
        aria-label="Messages du salon"
      >
        <div className="chat-hello">
          <MessageCircle size={20} />
          <strong>Le moment se partage aussi ici.</strong>
          <p>Un commentaire, une question, un petit bonjour.</p>
        </div>
        {hasOlder && (
          <button className="chat-older" onClick={() => void onOlder()}>
            Charger les messages précédents
          </button>
        )}
        {loading && (
          <p className="chat-loading">
            <LoaderCircle size={16} className="spin" /> Chargement…
          </p>
        )}
        {messages.map((m) => (
          <article className={`chat-message ${m.author_id === identity ? 'own' : ''}`} key={m.id}>
            <header>
              <strong>
                {m.nickname}
                {m.author_id === identity ? ' · toi' : ''}
              </strong>
              <span title={m.author_id}>#{m.author_id.slice(0, 4)}</span>
              <time dateTime={m.created_at}>
                {new Date(m.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </header>
            <p>{m.body}</p>
          </article>
        ))}
      </div>
      {newBelow && (
        <button
          className="chat-new"
          onClick={() => {
            stick.current = true;
            if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
            setNewBelow(false);
          }}
        >
          Voir les nouveaux messages ↓
        </button>
      )}
      {error && (
        <p className="chat-error" role="status">
          {error}
        </p>
      )}
      <form className="chat-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="chat-draft">
          Ton message
        </label>
        <textarea
          id="chat-draft"
          rows={2}
          maxLength={1000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Entre dans la conversation…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div>
          <span>{draft.length}/1000 · Maj + Entrée pour une nouvelle ligne</span>
          <button type="submit" aria-label="Envoyer le message" disabled={sending || !draft.trim()}>
            {sending ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </section>
  );
}
