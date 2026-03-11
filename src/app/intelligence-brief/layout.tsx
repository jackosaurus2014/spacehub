import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Weekly Intelligence Brief',
  description: 'Curated weekly summary of space industry developments, funding, launches, and regulatory changes.',
  openGraph: {
    title: 'Weekly Intelligence Brief | SpaceNexus',
    description: 'Curated weekly summary of space industry developments, funding, launches, and regulatory changes.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Weekly Intelligence Brief | SpaceNexus',
    description: 'Curated weekly summary of space industry developments, funding, launches, and regulatory changes.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/intelligence-brief',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
