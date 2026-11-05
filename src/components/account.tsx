'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, LoaderCircle, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { Brand, BrandMark } from './brand';
import { api } from '@/lib/api';
import { safeNext } from '@/lib/identity-mode';

export type AccountSession = {
  mode: 'prototype' | 'supabase';
  user: null | { nickname: string; anonymous: boolean; canCreate: boolean };
};

export function Account() {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [checking, setChecking] = useState(true);
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
    if (q.get('reset') === '1') {
      setMode('password');
    }
    if (q.get('error')) {
      setError(
        'Le lien a expiré ou a été ouvert dans un autre navigateur. Reconnecte-toi ou demande un nouveau lien.',
      );
    }
    setNickname(sessionStorage.getItem('mates:nickname') || '');
    void refresh()
      .catch(() =>
        setError(
          'Impossible de retrouver ta session. Recharge la page ou réessaie dans un instant.',
        ),
      )
      .finally(() => setChecking(false));
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

  function changeMode(value: 'login' | 'signup' | 'recover') {
    setMode(value);
    setMessage('');
    setError('');
  }

  return (
    <main id="main-content" className="mates-auth-page">
      <section className="mates-auth-shell" aria-label="Bienvenue sur Mates">
        <div className="mates-auth-left">
          <header className="mates-auth-brand">
            <Brand />
            <span className="mates-auth-online">
              <i /> YOUR PEOPLE ARE HERE
            </span>
          </header>

          <div className="mates-auth-content">
            <BrandMark className="mates-auth-logo" />
            <p className="mates-auth-kicker">YOUR SPACE. YOUR PEOPLE.</p>
            <h1>
              {mode === 'signup'
                ? 'Join Mates'
                : mode === 'recover'
                  ? 'Reset password'
                  : mode === 'password'
                    ? 'New password'
                    : 'Welcome back!'}
            </h1>
            <p className="mates-auth-subtitle">
              {mode === 'signup'
                ? 'Create your account to host rooms and watch together'
                : mode === 'recover'
                  ? 'We will email you a recovery link'
                  : mode === 'password'
                    ? 'Choose a new password for your account'
                    : 'Sign in to join a room or create your own'}
            </p>

            <div className="mates-auth-email-panel">
              {checking ? (
                <p className="loading-line">
                  <LoaderCircle className="spin" size={17} /> Checking your account…
                </p>
              ) : !session ? (
                <button className="button secondary full" onClick={() => window.location.reload()}>
                  Retry
                </button>
              ) : session.mode === 'prototype' ? (
                <p className="mates-auth-notice">
                  Email accounts are not enabled on this deployment yet. You can still explore and
                  join rooms as a guest.
                </p>
              ) : session.user?.canCreate && mode !== 'password' ? (
                <>
                  <p className="account-success">
                    <Check size={17} /> Signed in
                    {session.user.nickname ? ` · ${session.user.nickname}` : ''}
                  </p>
                  <Link href={next} className="button primary full">
                    Continue to Mates <ArrowRight size={17} />
                  </Link>
                  <button
                    className="text-link account-logout"
                    onClick={() => void logout()}
                    disabled={busy}
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </>
              ) : (
                <>
                  {session.user?.anonymous && (
                    <p className="mates-auth-notice">
                      You are currently joining as a guest. Creating an account keeps your guest
                      identity.
                    </p>
                  )}
                  {(mode === 'login' || mode === 'signup') && (
                    <div className="launcher-tabs" role="group" aria-label="Account">
                      <button
                        type="button"
                        aria-pressed={mode === 'login'}
                        onClick={() => changeMode('login')}
                      >
                        Sign in
                      </button>
                      <button
                        type="button"
                        aria-pressed={mode === 'signup'}
                        onClick={() => changeMode('signup')}
                      >
                        Create account
                      </button>
                    </div>
                  )}
                  <form onSubmit={submit} className="mates-auth-email-form">
                    {mode === 'signup' && (
                      <>
                        <label htmlFor="account-nickname">Display name</label>
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
                        <label htmlFor="account-email">Email address</label>
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
                          {mode === 'password' ? 'New password' : 'Password'}
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
                            ? 'Sign in'
                            : mode === 'signup'
                              ? 'Create account'
                              : mode === 'recover'
                                ? 'Send recovery link'
                                : 'Save password'}{' '}
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </form>
                  {mode !== 'password' && (
                    <button
                      type="button"
                      className="text-link account-logout"
                      onClick={() => changeMode(mode === 'recover' ? 'login' : 'recover')}
                    >
                      {mode === 'recover' ? 'Back to sign in' : 'Forgot password?'}
                    </button>
                  )}
                </>
              )}
            </div>

            {error && (
              <p className="mates-auth-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="mates-auth-notice" role="status">
                {message}
              </p>
            )}

            <div className="mates-auth-divider">
              <span /> <b>or</b> <span />
            </div>
            <div className="mates-auth-guest">
              <Link href="/explore">Browse rooms</Link>
              <span aria-hidden="true">·</span>
              <Link href="/">Continue as guest</Link>
            </div>
          </div>

          <footer className="mates-auth-footer">
            <span>
              <ShieldCheck size={15} /> Safe spaces. Real conversations.
            </span>
            <span>© Mates</span>
          </footer>
        </div>

        <aside className="mates-auth-visual" aria-label="Mates mascot">
          <div className="mates-auth-visual-glow" />
          <div className="mates-auth-orbit mates-auth-orbit-one" />
          <div className="mates-auth-orbit mates-auth-orbit-two" />
          <div className="mates-auth-neon-ribbon" />
          <div className="mates-auth-spark mates-auth-spark-one">✳</div>
          <div className="mates-auth-spark mates-auth-spark-two">✦</div>
          <Image
            className="mates-auth-mascot"
            src="/mates-mascot.png"
            alt="Mates friendly robot mascot giving a thumbs up"
            width={900}
            height={985}
            priority
          />
          <div className="mates-auth-visual-caption">
            <span className="mates-auth-caption-icon">
              <Sparkles size={15} />
            </span>
            <div>
              <strong>Better together.</strong>
              <small>Meet. Watch. Chill.</small>
            </div>
          </div>
          <div className="mates-auth-visual-badge">
            <i /> MADE FOR YOUR MOMENTS
          </div>
        </aside>
      </section>
    </main>
  );
}
