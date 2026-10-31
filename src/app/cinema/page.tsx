import type { Metadata } from 'next';
import { Cinema } from '@/components/cinema';
export const metadata: Metadata = {
  title: 'Cinéma',
  description: 'Une séance entre proches, un écran partagé et le même moment pour tous.',
};
export default function Page() {
  return <Cinema />;
}
