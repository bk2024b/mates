'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, RefreshCw, Search, Users, Radio, Plus, LoaderCircle } from 'lucide-react';
import { Brand } from './brand';
import { SiteHeader } from './site-header';
import { api } from '@/lib/api';
import type { RoomInfo } from '@/lib/contracts';
export function Explore() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [query, setQuery] = useState('');
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      setRefreshing(true);
      try {
        const data = await api<{ rooms: RoomInfo[]; updatedAt: string }>('/api/discovery');
        if (!disposed) {
          setRooms(data.rooms);
          setUpdated(data.updatedAt);
          setError('');
        }
      } catch {
        if (!disposed) setError('Impossible d’actualiser les salons. Réessaie dans un instant.');
      } finally {
        if (!disposed) {
          setLoading(false);
          setRefreshing(false);
          timer = setTimeout(refresh, 30000);
        }
      }
    }
    void refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [refreshKey]);
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr');
  const visible = rooms.filter(
    (r) =>
      normalize(r.title).includes(normalize(query.trim())) &&
      (!available || r.maxParticipants === 0 || r.participants < r.maxParticipants),
  );
  return (
    <main id="main-content" className="explore-page">
      <SiteHeader />
      <section className="explore-hero wrap">
        <span className="eyebrow">
          <Radio size={15} /> LES CONVERSATIONS SONT DÉJÀ LÀ
        </span>
        <h1>
          Trouve tes <span>mates.</span>
        </h1>
        <p>
          Un sujet qui t’intrigue, une passion en commun.
          <br />
          Choisis un salon et entre avec ton pseudo.
        </p>
      </section>
      <section className="wrap explore-directory" aria-label="Salons publics">
        <div className="explore-filters">
          <label className="explore-search">
            <Search size={19} />
            <span className="sr-only">Rechercher un sujet</span>
            <input
              type="search"
              maxLength={80}
              placeholder="IA, animés, musique, projets…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="explore-available">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Avec des places libres
          </label>
          <button
            className="button secondary"
            disabled={refreshing}
            onClick={() => setRefreshKey((v) => v + 1)}
            aria-label="Actualiser les salons"
          >
            <RefreshCw size={17} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
        <div className="explore-summary" aria-live="polite">
          <span>
            {loading
              ? 'À la recherche des conversations…'
              : error && !updated
                ? 'Liste momentanément indisponible'
                : `${visible.length} salon${visible.length > 1 ? 's' : ''} en cours`}
          </span>
          {updated && (
            <small>
              Actualisé à{' '}
              {new Date(updated).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </small>
          )}
        </div>
        {error && (
          <p className="error" role="status">
            {error}
            {rooms.length > 0 ? ' Les résultats affichés peuvent avoir changé.' : ''}
          </p>
        )}
        {loading ? (
          <div className="explore-empty">
            <LoaderCircle size={28} className="spin" />
            <h2>On regarde qui est là…</h2>
          </div>
        ) : visible.length ? (
          <div className="explore-grid">
            {visible.map((r, i) => {
              const full = r.maxParticipants > 0 && r.participants >= r.maxParticipants;
              return (
                <article className="explore-card" key={r.id}>
                  <div className={`explore-card-icon tone-${i % 3}`} aria-hidden="true">
                    {['✳', '✦', '☺'][i % 3]}
                  </div>
                  <span className="explore-live">
                    <span className="live-dot" /> EN DIRECT
                  </span>
                  <h2>{r.title}</h2>
                  <p>
                    <Users size={16} />
                    {r.participants}
                    {r.maxParticipants > 0 ? ` / ${r.maxParticipants}` : ''} mate
                    {r.participants > 1 ? 's' : ''}
                  </p>
                  {full ? (
                    <span className="explore-full">Le salon est complet</span>
                  ) : (
                    <Link className="button secondary" href={`/room/${r.id}`}>
                      Rejoindre le moment <ArrowRight size={17} />
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        ) : error && !updated ? (
          <div className="explore-empty">
            <h2>Les salons prennent un instant à répondre.</h2>
            <p>Utilise le bouton d’actualisation pour réessayer.</p>
          </div>
        ) : (
          <div className="explore-empty">
            <span aria-hidden="true">✳</span>
            <h2>
              {query.trim() || available
                ? 'Pas de salon pour cette recherche.'
                : 'Le prochain moment attend son hôte.'}
            </h2>
            <p>
              {query.trim() || available
                ? 'Essaie un autre sujet ou retire le filtre.'
                : 'Lance un salon public autour de ce qui te passionne.'}
            </p>
            <Link className="button primary" href="/">
              Créer un salon <Plus size={17} />
            </Link>
          </div>
        )}
        <p className="explore-note">
          Seuls les salons publics avec des participants apparaissent ici. Les places peuvent
          changer avant ton arrivée. Les salons accessibles par lien restent hors de cette liste.
        </p>
      </section>
      <footer className="site-footer wrap">
        <Brand />
        <span>Les mêmes passions. Le même moment.</span>
        <Link href="/">
          Lancer une conversation <ArrowRight size={15} />
        </Link>
      </footer>
    </main>
  );
}
