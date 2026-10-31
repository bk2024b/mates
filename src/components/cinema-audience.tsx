'use client';
import { useState } from 'react';
import type { Participant } from 'livekit-client';
import { Users, Mic, MicOff, Check, Armchair, ChevronDown } from 'lucide-react';
import type { ChatEvent } from '@/lib/chat';
import { cinemaHost, cinemaReady } from '@/lib/cinema-view';
type Reaction = Extract<ChatEvent, { type: 'reaction' }>;
export function CinemaAudience({
  people,
  reactions,
  blocked,
  immersion,
  onExpand,
  onPeople,
  onBlock,
}: {
  people: Participant[];
  reactions: Reaction[];
  blocked: Set<string>;
  immersion: boolean;
  onExpand: () => void;
  onPeople: () => void;
  onBlock?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const sorted = people
    .filter((p) => p.identity)
    .sort(
      (a, b) =>
        Number(cinemaHost(b.metadata)) - Number(cinemaHost(a.metadata)) ||
        a.identity.localeCompare(b.identity),
    );
  const visible = expanded ? sorted : sorted.slice(0, 12);
  const current = sorted.find((p) => p.identity === selected);
  if (immersion)
    return (
      <section className="cinema-presence" aria-label="Présence des spectateurs">
        <div>
          {sorted.slice(0, 8).map((p) => (
            <span
              className={p.isSpeaking && !blocked.has(p.identity) ? 'speaking' : ''}
              key={p.identity}
              title={p.name || 'Un mate'}
            >
              {(p.name || 'M').slice(0, 1)}
              {reactions
                .filter((r) => r.authorId === p.identity)
                .slice(-1)
                .map((r) => (
                  <b key={r.id}>{r.emoji}</b>
                ))}
            </span>
          ))}
        </div>
        <button onClick={onExpand}>{sorted.length} dans la salle · Retrouver les fauteuils</button>
      </section>
    );
  return (
    <section className="cinema-audience" aria-label="Les spectateurs dans la salle">
      <header>
        <span>
          <Users size={14} />
          {sorted.length} dans la salle
        </span>
        <span className="audience-whisper">Vous êtes au même endroit, le temps d’un film.</span>
      </header>
      <div className={`cinema-seats ${expanded ? 'all-seats' : ''}`}>
        {visible.map((p, index) => {
          const latest = reactions.filter((r) => r.authorId === p.identity).at(-1);
          const ready = cinemaReady(p.metadata);
          return (
            <button
              key={p.identity}
              className={`cinema-seat ${p.isSpeaking && !blocked.has(p.identity) ? 'speaking' : ''} ${p.isLocal ? 'your-seat' : ''} ${selected === p.identity ? 'seat-selected' : ''}`}
              aria-label={`${p.name || 'Un mate'}${p.isLocal ? ', toi' : ''}${ready ? ', prêt' : ''}`}
              aria-expanded={selected === p.identity}
              aria-controls="seat-detail"
              onClick={() => setSelected((v) => (v === p.identity ? null : p.identity))}
            >
              <span className="seat-reaction" aria-hidden="true">
                {latest && <b key={latest.id}>{latest.emoji}</b>}
              </span>
              <span className="seat-head">{(p.name || 'M').slice(0, 2).toUpperCase()}</span>
              <span className="seat-back">
                <Armchair size={32} />
                {ready && <Check size={11} className="seat-ready" />}
              </span>
              <span className="seat-label">
                {p.isLocal ? 'Toi' : p.name || `Mate ${index + 1}`}
              </span>
            </button>
          );
        })}
      </div>
      {current && (
        <div className="cinema-seat-detail" id="seat-detail">
          <strong>
            {current.name || 'Un mate'}
            {current.isLocal ? ' · toi' : ''}
          </strong>
          <span>
            {cinemaHost(current.metadata) ? 'Projectionniste · ' : ''}
            {current.isMicrophoneEnabled ? <Mic size={13} /> : <MicOff size={13} />}
          </span>
          {onBlock && !current.isLocal && (
            <button onClick={() => onBlock(current.identity)}>
              {blocked.has(current.identity) ? 'Débloquer' : 'Bloquer'}
            </button>
          )}
          <button onClick={onPeople}>Voir les participants</button>
          <button onClick={() => setSelected(null)} aria-label="Fermer le détail du fauteuil">
            ×
          </button>
        </div>
      )}
      <footer>
        {sorted.length > 6 && (
          <button
            className="audience-expand"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDown size={14} />
            {expanded ? 'Réduire la salle' : `Voir toute la salle (${sorted.length})`}
          </button>
        )}
        <span>Les réactions apparaissent au-dessus des places.</span>
      </footer>
    </section>
  );
}
