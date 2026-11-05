import type { Metadata, Viewport } from 'next';
import './globals.css';
import './product.css';
import './mates-neon.css';
import './mates-v2.css';
export const viewport: Viewport = { themeColor: '#0f0f10', viewportFit: 'cover' };
export const metadata: Metadata = {
  title: { default: 'Mates — Les mêmes passions. Le même moment.', template: '%s · Mates' },
  description:
    'Trouve ta tribu autour de tes passions. Salons en direct, partage d’écran, chat et rencontres, avec un simple pseudo.',
  robots: { index: false, follow: false },
  icons: { icon: '/icon.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
