import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investment Tracker | SpaceNexus',
  description: 'Track space industry investment trends, top deals, and leading investors.',
  openGraph: {
    title: 'Investment Tracker | SpaceNexus',
    description: 'Track space industry investment trends, top deals, and leading investors.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Investment Tracker | SpaceNexus',
    description: 'Track space industry investment trends, top deals, and leading investors.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/investment-tracker',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
