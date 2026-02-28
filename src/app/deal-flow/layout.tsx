import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deal Flow Database | SpaceNexus',
  description: 'Track space industry funding rounds, M&A, partnerships, and government contracts.',
  openGraph: {
    title: 'Deal Flow Database | SpaceNexus',
    description: 'Track space industry funding rounds, M&A, partnerships, and government contracts.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Deal Flow Database | SpaceNexus',
    description: 'Track space industry funding rounds, M&A, partnerships, and government contracts.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/deal-flow',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
