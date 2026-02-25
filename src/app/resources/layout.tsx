import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources & Podcasts | SpaceNexus',
  description: 'Curated directory of space industry podcasts, newsletters, YouTube channels, and conferences.',
  openGraph: {
    title: 'Resources & Podcasts | SpaceNexus',
    description: 'Curated directory of space industry podcasts, newsletters, YouTube channels, and conferences.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
