import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reading List | SpaceNexus',
  description: 'Your saved articles, reports, and bookmarked content from across SpaceNexus.',
  openGraph: {
    title: 'Reading List | SpaceNexus',
    description: 'Your saved articles, reports, and bookmarked content from across SpaceNexus.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
