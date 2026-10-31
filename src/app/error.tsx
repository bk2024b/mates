'use client';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="entry-page">
      <SiteHeader />
      <section className="entry-card product-error">
        <span className="eyebrow">UNE PETITE PAUSE IMPRÉVUE</span>
        <h1>Le fil a été coupé.</h1>
        <p className="muted">La page n’a pas pu s’afficher. Réessaie pour reprendre le moment.</p>
        <button className="button primary full" onClick={reset}>
          Réessayer
        </button>
        <Link href="/" className="text-link">
          Retourner à l’accueil
        </Link>
      </section>
    </main>
  );
}
