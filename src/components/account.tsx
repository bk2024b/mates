'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react';
import { Brand } from './brand';
import { api } from '@/lib/api';
import { safeNext } from '@/lib/identity-mode';
export type AccountSession = {
  mode: 'prototype' | 'supabase';
  user: null | { nickname: string; anonymous: boolean; canCreate: boolean };
};
export function Account() {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'recover' | 'password'>('login');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [next, setNext] = useState('/');
  async function refresh() {
    setSession(await api<AccountSession>('/api/auth/session'));
  }
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setNext(safeNext(q.get('next')));
    if (q.get('reset') === '1') setMode('password');
    if (q.get('error'))
      setError(
        'Le lien a expiré ou a été ouvert dans un autre navigateur. Reconnecte-toi ou demande un nouveau lien.',
      );
    setNickname(sessionStorage.getItem('mates:nickname') || '');
    void refresh().catch(() =>
      setError(
        'La session n’a pas pu être vérifiée. Vérifie la configuration Supabase puis recharge la page.',
      ),
    );
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api<{ message?: string; authenticated?: boolean }>(`/api/auth/${mode}`, {
        email,
        password,
        nickname,
      });
      setPassword('');
      if (mode === 'login' || (mode === 'signup' && result.authenticated)) {
        if (nickname) sessionStorage.setItem('mates:nickname', nickname);
        window.location.assign(next);
        return;
      }
      setMessage(result.message || 'Opération effectuée.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Réessaie.');
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/logout', {});
      await refresh();
      setMode('login');
    } catch {
      setError('Déconnexion impossible. Réessaie.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="entry-page">
      <header className="site-header wrap">
        <Brand />
        <Link href="/" className="text-link">
          <ArrowLeft size={16} /> Retour aux salons
        </Link>
      </header>
      <section className="entry-card">
        <span className="eyebrow">TON ESPACE MATES</span>
        <div className="entry-art">
          <span>☺</span>
        </div>
        <h1>
          {session?.user?.canCreate && mode !== 'password'
            ? 'Prêt à lancer le sujet ?'
            : mode === 'signup'
              ? 'Crée ton compte.'
              : mode === 'recover'
                ? 'On te retrouve.'
                : mode === 'password'
                  ? 'Un nouveau départ.'
                  : 'Content de te revoir.'}
        </h1>
        <p className="muted">
          Ton email reste privé. Les autres participants voient uniquement ton pseudo.
        </p>
        {session?.mode === 'prototype' ? (
          <p className="notice">
            Les comptes seront disponibles lorsque l’intégration Supabase sera activée. Tu peux
            continuer à utiliser les salons actuels.
          </p>
        ) : session?.user?.canCreate && mode !== 'password' ? (
          <>
            <p className="account-success">
              <Check size={17} /> Compte connecté
              {session.user.nickname ? ` · ${session.user.nickname}` : ''}
            </p>
            <Link href={next} className="button primary full">
              Retourner aux salons <ArrowRight size={17} />
            </Link>
            <button
              className="text-link account-logout"
              onClick={() => void logout()}
              disabled={busy}
            >
              <LogOut size={15} /> Se déconnecter
            </button>
          </>
        ) : (
          <>
            {session?.user?.anonymous && (
              <p className="notice">
                Tu participes comme invité. Créer un compte depuis cet écran conserve ton identité
                invitée après confirmation de l’email.
              </p>
            )}
            {(mode === 'login' || mode === 'signup') && (
              <div className="launcher-tabs">
                <button
                  onClick={() => {
                    setMode('login');
                    setMessage('');
                    setError('');
                  }}
                >
                  Connexion
                </button>
                <button
                  onClick={() => {
                    setMode('signup');
                    setMessage('');
                    setError('');
                  }}
                >
                  Inscription
                </button>
              </div>
            )}
            <form onSubmit={submit}>
              {mode === 'signup' && (
                <>
                  <label htmlFor="account-nickname">Ton pseudo</label>
                  <input
                    id="account-nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    minLength={2}
                    maxLength={28}
                    required
                    autoComplete="nickname"
                  />
                </>
              )}
              {mode !== 'password' && (
                <>
                  <label htmlFor="account-email">Email privé</label>
                  <input
                    id="account-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={254}
                    required
                  />
                </>
              )}
              {mode !== 'recover' && (
                <>
                  <label htmlFor="account-password">
                    {mode === 'password' ? 'Nouveau mot de passe' : 'Mot de passe'}
                  </label>
                  <input
                    id="account-password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </>
              )}
              <button className="button primary full" disabled={busy || !session}>
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <>
                    {mode === 'login'
                      ? 'Se connecter'
                      : mode === 'signup'
                        ? 'Créer mon compte'
                        : mode === 'recover'
                          ? 'Recevoir le lien'
                          : 'Enregistrer le mot de passe'}
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
            <button
              className="text-link account-logout"
              onClick={() => {
                setMode(mode === 'recover' ? 'login' : 'recover');
                setMessage('');
                setError('');
              }}
            >
              {mode === 'recover' ? 'Retour à la connexion' : 'Mot de passe oublié ?'}
            </button>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <p className="privacy-note">
          <ShieldCheck size={15} /> Aucun nom réel demandé.
        </p>
      </section>
    </main>
  );
}
