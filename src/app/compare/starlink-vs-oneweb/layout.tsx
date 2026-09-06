import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Starlink vs OneWeb: 10,000+ vs 648 Satellites Compared (2026)',
  description:
    'Starlink runs more than 10,000 satellites at 340-570 km for consumers and enterprises; Eutelsat OneWeb runs 648 at 1,200 km for business and government. Latency, speed, coverage, terminals and who each one is for.',
  keywords: [
    'Starlink vs OneWeb',
    'satellite internet comparison',
    'LEO broadband comparison',
    'SpaceX Starlink vs Eutelsat OneWeb',
    'satellite constellation comparison',
    'enterprise satellite internet',
    'global broadband coverage',
  ],
  openGraph: {
    title: 'Starlink vs OneWeb: 10,000+ vs 648 Satellites Compared (2026)',
    description:
      'Compare Starlink and OneWeb side-by-side: constellation size, coverage, target markets, latency, and orbital strategies.',
    type: 'website',
    url: 'https://spacenexus.us/compare/starlink-vs-oneweb',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=Starlink+vs+OneWeb&type=compare',
        width: 1200,
        height: 630,
        alt: 'Starlink vs OneWeb Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starlink vs OneWeb: 10,000+ vs 648 Satellites Compared (2026)',
    description:
      'Compare Starlink and OneWeb side-by-side: constellation size, coverage, target markets, latency, and orbital strategies.',
    images: ['/api/og?title=Starlink+vs+OneWeb&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/starlink-vs-oneweb',
  },
};

export default function StarlinkVsOneWebLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
