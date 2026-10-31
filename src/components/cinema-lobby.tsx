'use client';
import { useState } from 'react';
import type { Participant } from 'livekit-client';
import { Check, Ticket, LoaderCircle } from 'lucide-react';
import { cinemaReady } from '@/lib/cinema-view';
import { api } from '@/lib/api';
export function CinemaLobby({
  roomId,
  title,
  people,
  local,
  connected,
}: {
  roomId: string;
  title: string;
  people: Participant[];
  local: Participant;
  connected: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const ready = cinemaReady(local.metadata);
  const count = people.filter((p) => cinemaReady(p.metadata)).length;
  async function toggle() {
    setBusy(true);
    setError('');
    try {
      await api(`/api/rooms/${roomId}/cinema`, { ready: !ready });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de confirmer ta présence.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="cinema-lobby-ticket">
      <Ticket size={26} />
      <div>
        <span className="eyebrow">TON BILLET POUR CE SOIR</span>
        <strong>{title}</strong>
        <p>{local.name || 'Ton pseudo'} · Une place parmi les tiens.</p>
        <span className="cinema-ready-count" aria-live="polite">
          {count} / {people.filter((p) => p.identity).length} prêts · L’hôte choisit quand lancer.
        </span>
      </div>
      <button
        className={ready ? 'is-ready' : ''}
        disabled={!connected || busy}
        aria-pressed={ready}
        onClick={() => void toggle()}
      >
        {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}
        {ready ? 'Je suis installé' : 'Je suis prêt'}
      </button>
      {error && (
        <p className="error" role="status">
          {error}
        </p>
      )}
    </section>
  );
}
