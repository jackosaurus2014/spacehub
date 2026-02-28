import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Space Digest | SpaceNexus',
  description: 'Quick-scan daily headlines covering launches, funding, regulatory changes, and technology breakthroughs.',
  openGraph: {
    title: 'Daily Space Digest | SpaceNexus',
    description: 'Quick-scan daily headlines covering launches, funding, regulatory changes, and technology breakthroughs.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Daily Space Digest | SpaceNexus',
    description: 'Quick-scan daily headlines covering launches, funding, regulatory changes, and technology breakthroughs.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/news-digest',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
