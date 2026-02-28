import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reading List | SpaceNexus',
  description: 'Your saved articles, reports, and bookmarked content from across SpaceNexus.',
  openGraph: {
    title: 'Reading List | SpaceNexus',
    description: 'Your saved articles, reports, and bookmarked content from across SpaceNexus.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Reading List | SpaceNexus',
    description: 'Your saved articles, reports, and bookmarked content from across SpaceNexus.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/reading-list',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
