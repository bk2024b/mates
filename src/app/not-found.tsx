import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
export default function NotFound() {
  return (
    <main id="main-content" className="entry-page">
      <SiteHeader />
      <section className="entry-card product-error">
        <span className="eyebrow">PETIT DÉTOUR · 404</span>
        <div className="entry-art" aria-hidden="true">
          <span>✳</span>
        </div>
        <h1>On s’est ratés de peu.</h1>
        <p className="muted">
          Cette page n’existe plus, mais il y a encore des moments à partager.
        </p>
        <Link href="/explore" className="button primary full">
          Retrouver les salons <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
