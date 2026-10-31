'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, ArrowUpRight, Plus } from 'lucide-react';
import { Brand } from './brand';
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <header className={`site-header product-header wrap ${open ? 'nav-open' : ''}`}>
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>
      <Brand />
      <nav aria-label="Navigation principale" id="site-navigation">
        <Link
          href="/explore"
          aria-current={path === '/explore' ? 'page' : undefined}
          onClick={() => setOpen(false)}
        >
          Explorer <ArrowUpRight size={14} />
        </Link>
        <Link
          href="/account"
          aria-current={path === '/account' ? 'page' : undefined}
          onClick={() => setOpen(false)}
        >
          Mon espace
        </Link>
        <Link className="nav-create" href="/#start" onClick={() => setOpen(false)}>
          Créer un salon <Plus size={16} />
        </Link>
      </nav>
      <button
        className="menu-toggle"
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={open}
        aria-controls="site-navigation"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
    </header>
  );
}
