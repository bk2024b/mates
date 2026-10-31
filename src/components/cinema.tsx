'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Film,
  Ticket,
  MonitorUp,
  Users,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { SiteHeader } from './site-header';
import { api } from '@/lib/api';
import type { RoomInfo } from '@/lib/contracts';
export function Cinema() {
  const [name, setName] = useState(''),
    [title, setTitle] = useState(''),
    [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'link' | 'public'>('link');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]),
    [directoryError, setDirectoryError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    setName(sessionStorage.getItem('mates:nickname') || '');
    try {
      const draft = JSON.parse(sessionStorage.getItem('mates:cinema-draft') || '{}');
      if (typeof draft.title === 'string') setTitle(draft.title.slice(0, 80));
      if (typeof draft.description === 'string') setDescription(draft.description.slice(0, 240));
      if (draft.visibility === 'public') setVisibility('public');
    } catch {}
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const data = await api<{ rooms: RoomInfo[] }>('/api/discovery');
        if (!disposed) {
          setRooms(data.rooms.filter((r) => r.kind === 'cinema'));
          setDirectoryError('');
        }
      } catch {
        if (!disposed)
          setDirectoryError(
            'Les séances publiques ne peuvent pas être actualisées pour le moment.',
          );
      } finally {
        if (!disposed) {
          setLoading(false);
          timer = setTimeout(refresh, 30000);
        }
      }
    }
    void refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, []);
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    sessionStorage.setItem(
      'mates:cinema-draft',
      JSON.stringify({ title, description, visibility }),
    );
    try {
      const account = await api<{ mode: string; user: null | { canCreate: boolean } }>(
        '/api/auth/session',
      );
      if (account.mode === 'supabase' && !account.user?.canCreate) {
        sessionStorage.setItem('mates:nickname', name);
        window.location.assign('/account?next=/cinema');
        return;
      }
      const result = await api<{ id: string }>('/api/rooms', {
        name,
        title,
        description,
        visibility,
        kind: 'cinema',
      });
      sessionStorage.setItem('mates:nickname', name);
      sessionStorage.removeItem('mates:cinema-draft');
      window.location.assign('/room/' + result.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La séance n’a pas pu être créée.');
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="cinema-page">
      <SiteHeader />
      <section className="cinema-hero wrap">
        <div className="cinema-copy">
          <span className="eyebrow">
            <Film size={16} /> MATES PRÉSENTE
          </span>
          <h1>
            Ce soir,
            <br />
            on regarde
            <br />
            <em>ensemble.</em>
          </h1>
          <p>
            Un film, tes proches et les réactions en direct.
            <br />
            Les kilomètres restent à la porte.
          </p>
          <div className="cinema-ticket" aria-hidden="true">
            <Ticket size={28} />
            <div>
              UNE PLACE POUR TOI<strong>La meilleure rangée, c’est la vôtre.</strong>
            </div>
            <span>✳</span>
          </div>
          <div className="cinema-promises">
            <span>
              <Users size={15} /> Jusqu’à 50 personnes
            </span>
            <span>
              <ShieldCheck size={15} /> Privé par défaut
            </span>
          </div>
        </div>
        <div className="cinema-create" id="create-session">
          <div className="cinema-form-top">
            <span className="eyebrow">TA SALLE, TON PROGRAMME</span>
            <Film size={20} />
          </div>
          <h2>On projette quoi ?</h2>
          <p>
            Lance ta séance, invite les tiens et retrouve-les dans le foyer avant de partager ton
            écran.
          </p>
          <form onSubmit={create}>
            <label htmlFor="cinema-name">Ton pseudo</label>
            <input
              id="cinema-name"
              autoComplete="nickname"
              minLength={2}
              maxLength={28}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Le projectionniste, c’est toi"
            />
            <label htmlFor="cinema-title">Le titre de la séance</label>
            <input
              id="cinema-title"
              required
              minLength={3}
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Le film du vendredi soir"
            />
            <label htmlFor="cinema-description">
              Un mot pour tes invités <span>facultatif</span>
            </label>
            <textarea
              id="cinema-description"
              rows={2}
              maxLength={240}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Préparez le popcorn, on vous attend !"
            />
            <label htmlFor="cinema-access">Qui peut venir ?</label>
            <select
              id="cinema-access"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'link' | 'public')}
            >
              <option value="link">Mes invités, avec le lien</option>
              <option value="public">Tout le monde, dans les séances publiques</option>
            </select>
            <p className="cinema-form-hint">
              {visibility === 'link'
                ? 'La séance ne sera pas listée. Toute personne qui reçoit le lien pourra la rejoindre.'
                : 'La séance apparaîtra publiquement dès qu’elle sera occupée.'}
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <>
                  Ouvrir ma salle <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <small>
            <MonitorUp size={13} /> Projection depuis un ordinateur · onglet ou application
          </small>
        </div>
      </section>
      <section className="wrap cinema-how">
        <article>
          <span>01</span>
          <h3>Tout le monde s’installe.</h3>
          <p>
            Partage le lien et accueille tes invités dans le foyer. Micros et caméras coupés à
            l’arrivée.
          </p>
        </article>
        <article>
          <span>02</span>
          <h3>Le projectionniste lance.</h3>
          <p>
            Choisis un onglet vidéo ou une application. Vérifie l’aperçu et le son, puis partage la
            projection.
          </p>
        </article>
        <article>
          <span>03</span>
          <h3>Le même moment pour tous.</h3>
          <p>
            Pas de retour en arrière côté spectateur. Chat, réactions et discussion après le
            générique.
          </p>
        </article>
      </section>
      <section className="wrap cinema-public">
        <div className="cinema-section-title">
          <div>
            <span className="eyebrow">LE PROGRAMME EN DIRECT</span>
            <h2>Les portes sont ouvertes.</h2>
          </div>
          <Link href="/explore">
            Tous les salons <ArrowRight size={16} />
          </Link>
        </div>
        {loading ? (
          <p role="status">Recherche des séances…</p>
        ) : directoryError ? (
          <p className="error" role="status">
            {directoryError}
          </p>
        ) : rooms.length ? (
          <div className="explore-grid">
            {rooms.map((r) => {
              const full = r.maxParticipants > 0 && r.participants >= r.maxParticipants;
              return (
                <article className="cinema-session-card" key={r.id}>
                  <Film size={28} />
                  <span className="eyebrow">SÉANCE EN COURS</span>
                  <h3>{r.title}</h3>
                  <p>
                    {r.participants} / {r.maxParticipants} personnes
                  </p>
                  {full ? (
                    <span>Complet</span>
                  ) : (
                    <Link href={'/room/' + r.id} className="button secondary">
                      Entrer dans la salle <ArrowRight size={16} />
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="cinema-empty">
            <Ticket size={30} />
            <h3>Le prochain programme peut être le tien.</h3>
            <p>
              Les séances privées restent entre invités. Les séances publiques occupées apparaissent
              ici.
            </p>
            <a className="text-link" href="#create-session">
              Créer une séance <ArrowRight size={16} />
            </a>
          </div>
        )}
        <p className="cinema-fineprint">
          L’organisateur fournit le contenu qu’il est autorisé à diffuser. Certains services
          protégés bloquent la capture. Le son d’une application dépend du navigateur et du système.
          Le film n’est ni importé ni enregistré par Mates.
        </p>
      </section>
    </main>
  );
}
