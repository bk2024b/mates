'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  MonitorUp,
  Headphones,
  ShieldCheck,
  Sparkles,
  Check,
  LoaderCircle,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { Brand } from './brand';
import { SiteHeader } from './site-header';
import { PassionArt } from './passion-art';
import { api } from '@/lib/api';
import type { AccountSession } from './account';
import type { HealthInfo } from '@/lib/contracts';
export function Landing() {
  const [account, setAccount] = useState<AccountSession | null>(null);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'link'>('link');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [healthError, setHealthError] = useState(false);
  useEffect(() => {
    api<AccountSession>('/api/auth/session')
      .then(setAccount)
      .catch(() => {});
    setName(sessionStorage.getItem('mates:nickname') || '');
    setTitle(sessionStorage.getItem('mates:draft-title') || '');
    api<HealthInfo>('/api/health')
      .then(setHealth)
      .catch(() => setHealthError(true));
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'create') {
        sessionStorage.setItem('mates:nickname', name);
        sessionStorage.setItem('mates:draft-title', title);
        if (account?.mode === 'supabase' && !account.user?.canCreate) {
          window.location.assign('/account');
          return;
        }
        const data = await api<{ id: string }>('/api/rooms', { name, title, visibility });
        sessionStorage.setItem('mates:nickname', name);
        window.location.assign(`/room/${data.id}`);
      } else {
        let id = link.trim();
        try {
          id = new URL(id).pathname.split('/').filter(Boolean).pop() || '';
        } catch {}
        if (!/^mates-[a-f0-9]{24}$/.test(id))
          throw new Error('Colle le lien complet du salon ou son identifiant Mates.');
        sessionStorage.setItem('mates:nickname', name);
        window.location.assign(`/room/${id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Réessaie.');
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="landing">
      <SiteHeader />
      <section className="hero wrap">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="mini-orbit" /> MOINS DE SCROLL. PLUS DE VRAIS MOMENTS.
          </div>
          <h1>
            Ton truc.
            <br />
            Ta tribu.
            <br />
            <span>
              Votre moment
              <svg viewBox="0 0 280 18" aria-hidden="true">
                <path
                  d="M3 12Q115-3 275 8"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            .
          </h1>
          <p className="hero-description">
            Des inconnus, un point commun, et la conversation démarre. Trouve un salon ou crée le
            tien. Viens comme tu es.
          </p>
          <Link href="/explore" className="hero-explore">
            Trouver mon prochain salon <ArrowUpRight size={20} />
          </Link>
          <div className="hero-benefits">
            <span>
              <MonitorUp size={16} /> Le contenu au premier plan
            </span>
            <span>
              <ShieldCheck size={16} /> Ton pseudo suffit
            </span>
          </div>
          <PassionArt />
        </div>
        <div className="room-launcher" id="start">
          <div className="launcher-top">
            <span className="live-dot" /> ON SE RETROUVE ICI <Sparkles size={17} />
          </div>
          <div className="launcher-tabs" role="tablist" aria-label="Accès au salon">
            <button
              role="tab"
              aria-selected={mode === 'create'}
              onClick={() => {
                setMode('create');
                setError('');
              }}
            >
              Créer un salon
            </button>
            <button
              role="tab"
              aria-selected={mode === 'join'}
              onClick={() => {
                setMode('join');
                setError('');
              }}
            >
              Rejoindre
            </button>
          </div>
          <h2>{mode === 'create' ? 'À toi de lancer le sujet.' : 'Une place t’attend.'}</h2>
          <p className="muted">
            {mode === 'create'
              ? 'Crée ton espace et invite tes premiers mates.'
              : 'Entre avec un pseudo. Le reste se fait sur place.'}
          </p>
          <form onSubmit={submit}>
            <label htmlFor="nickname">Ton pseudo</label>
            <input
              id="nickname"
              autoComplete="nickname"
              minLength={2}
              maxLength={28}
              placeholder="Ex. Panda quantique"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {mode === 'create' ? (
              <>
                <label htmlFor="topic">De quoi on parle ?</label>
                <input
                  id="topic"
                  minLength={3}
                  maxLength={80}
                  placeholder="IA, animés, projets improbables…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <label htmlFor="visibility">Qui peut découvrir le salon ?</label>
                <select
                  id="visibility"
                  className="visibility-select"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as 'public' | 'link')}
                >
                  <option value="link">Uniquement les personnes avec le lien</option>
                  <option value="public">Tout le monde, dans Explorer</option>
                </select>
                <p className="visibility-hint">
                  {visibility === 'public'
                    ? 'Le sujet et le nombre de participants seront visibles dans Explorer dès que tu seras connecté au salon.'
                    : 'Le salon ne sera pas listé. Toute personne qui possède son lien pourra le rejoindre.'}
                </p>
              </>
            ) : (
              <>
                <label htmlFor="room-link">Lien du salon</label>
                <input
                  id="room-link"
                  placeholder="https://…/room/mates-…"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  required
                />
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary full"
              disabled={busy || (mode === 'create' && health !== null && !health.configured)}
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  {mode === 'create' ? 'Ouvrir mon salon' : 'Rejoindre le salon'}
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>
          <div className="launcher-foot">
            <Check size={14} /> Micro et caméra coupés à l’arrivée
          </div>
        </div>
      </section>
      {health && !health.configured && (
        <section className="setup-banner wrap" role="status">
          <Terminal size={22} />
          <div>
            <strong>Le studio est prêt. Il manque juste la connexion média.</strong>
            <p>
              Renseigne les variables LiveKit et APP_SESSION_SECRET dans <code>.env.local</code>,
              puis redémarre le serveur. Le README te guide pas à pas.
            </p>
            <small>À configurer : {health.missing.join(', ')}</small>
          </div>
          <Link href="/lab">
            Tester la mire <ChevronRight size={16} />
          </Link>
        </section>
      )}
      {healthError && (
        <p className="wrap error" role="alert">
          Impossible de vérifier le serveur. Recharge la page avant de créer un salon.
        </p>
      )}
      <div className="passion-ribbon" aria-label="Toutes les passions ont leur place">
        <span>
          ANIMÉS <b>✳</b> TECH <b>✳</b> MUSIQUE <b>✳</b> CRÉATION <b>✳</b> GAMING <b>✳</b> LES IDÉES
          DE 2H DU MATIN <b>✳</b>
        </span>
      </div>
      <section className="how wrap" id="comment">
        <div className="section-heading">
          <span className="eyebrow">PAS DE CÉRÉMONIE</span>
          <h2>Trois gestes. Et vous y êtes.</h2>
          <p>Pas besoin de se connaître pour avoir quelque chose à partager.</p>
        </div>
        <div className="feature-grid">
          <article>
            <span className="feature-icon lilac">
              <Sparkles />
            </span>
            <span className="step-number">01</span>
            <h3>Trouve le sujet.</h3>
            <p>Un projet à montrer, une vidéo à découvrir ou une passion à partager.</p>
          </article>
          <article>
            <span className="feature-icon lime">
              <MonitorUp />
            </span>
            <span className="step-number">02</span>
            <h3>Partage le moment.</h3>
            <p>L’hôte diffuse son écran avec son audio. Les autres profitent de la scène.</p>
          </article>
          <article>
            <span className="feature-icon peach">
              <Headphones />
            </span>
            <span className="step-number">03</span>
            <h3>Fais connaissance.</h3>
            <p>Un pseudo, une voix si tu veux. Aucune caméra obligatoire pour être là.</p>
          </article>
        </div>
      </section>
      <section className="product-cta wrap">
        <span className="cta-star" aria-hidden="true">
          ✳
        </span>
        <div>
          <span className="eyebrow">LE BON MOMENT, C’EST MAINTENANT</span>
          <h2>
            Ta prochaine rencontre
            <br />
            commence par un sujet.
          </h2>
        </div>
        <Link href="/explore" className="button primary">
          Explorer les salons <ArrowUpRight size={18} />
        </Link>
      </section>
      <footer className="site-footer wrap">
        <Brand />
        <span>Les mêmes passions. Le même moment.</span>
        <span>Des passions, des salons, des rencontres</span>
      </footer>
    </main>
  );
}
