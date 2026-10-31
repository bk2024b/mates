import type { Metadata } from 'next';
import { Explore } from '@/components/explore';
export const metadata: Metadata = {
  title: 'Explorer les salons',
  description: 'Trouve une discussion autour de tes passions et rejoins le moment avec un pseudo.',
};
export default function Page() {
  return <Explore />;
}
