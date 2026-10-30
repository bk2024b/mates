import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Mates — Les mêmes passions. Le même moment.', template: '%s · Mates' },
  description:
    'Un salon, un sujet, des gens à rencontrer. Prototype de partage d’écran haute qualité de Mates.',
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
