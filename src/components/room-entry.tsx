'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  MicOff,
  VideoOff,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Brand } from './brand';
import { api } from '@/lib/api';
import type { JoinInfo, RoomInfo } from '@/lib/contracts';
import { MeetingRoom } from './meeting-room';
export function RoomEntry({ roomId }: { roomId: string }) {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [join, setJoin] = useState<JoinInfo | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    setName(sessionStorage.getItem('mates:nickname') || '');
    api<RoomInfo>(`/api/rooms/${encodeURIComponent(roomId)}`)
      .then(setRoom)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roomId]);
  async function enter(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api<JoinInfo>(`/api/rooms/${encodeURIComponent(roomId)}/join`, { name });
      sessionStorage.setItem('mates:nickname', name);
      setEnded(false);
      setJoin(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  }
  if (join)
    return (
      <MeetingRoom
        session={join}
        onLeave={() => {
          setJoin(null);
          setEnded(true);
        }}
      />
    );
  return (
    <main className="entry-page">
      <header className="site-header wrap">
        <Brand />
        <Link href="/" className="text-link">
          <ArrowLeft size={16} /> Retour à l’accueil
        </Link>
      </header>
      <section className="entry-card">
        <span className="eyebrow">{ended ? 'À LA PROCHAINE' : 'POSE TES AFFAIRES'}</span>
        <div className="entry-art">
          <span>✳</span>
          <span>☺</span>
          <span>✦</span>
        </div>
        <h1>{ended ? 'Le salon reste à un clic.' : room?.title || 'Un moment entre mates.'}</h1>
        <p className="muted">
          {ended
            ? 'Tu as quitté le salon. Tu peux le rejoindre à nouveau.'
            : 'Choisis ton pseudo avant de rejoindre la conversation.'}
        </p>
        {loading ? (
          <p className="loading-line">
            <LoaderCircle className="spin" size={18} /> Recherche du salon…
          </p>
        ) : (
          room && (
            <>
              <span className="pill">
                <Users size={14} />
                {room.participants} / {room.maxParticipants} participants
              </span>
              <form onSubmit={enter}>
                <label htmlFor="join-name">Ton pseudo</label>
                <input
                  id="join-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={28}
                  required
                  autoComplete="nickname"
                  autoFocus
                />
                <div className="privacy-row">
                  <span>
                    <MicOff size={15} /> Micro coupé
                  </span>
                  <span>
                    <VideoOff size={15} /> Caméra coupée
                  </span>
                </div>
                <button className="button primary full" disabled={busy}>
                  {busy ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : (
                    <>
                      Entrer dans le salon
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </>
          )
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="privacy-note">
          <ShieldCheck size={15} /> Ton pseudo est public. Ton identité réelle n’est pas demandée.
        </p>
      </section>
    </main>
  );
}
