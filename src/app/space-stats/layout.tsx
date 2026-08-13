import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Stats 2026: $626B, 10K+ Sats',
  description:
    '$626B market, 10,000+ active satellites, 230+ annual launches, and $95B in government spending -- the definitive 2026 space industry statistics reference.',
  keywords: [
    'space industry statistics',
    'space industry market size',
    'space economy facts',
    'space industry data',
    'satellite statistics',
    'space launch statistics',
    'space industry growth',
    'space economy statistics',
    'space industry revenue',
    'space workforce statistics',
  ],
  openGraph: {
    title: 'Space Industry Stats 2026: $626B, 10K+ Sats',
    description:
      '$626B market, 10,000+ active satellites, 230+ annual launches, and $95B in government spending -- the definitive 2026 space industry statistics reference.',
    url: 'https://spacenexus.us/space-stats',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Stats 2026: $626B, 10K+ Sats',
    description:
      '$626B market, 10,000+ active satellites, 230+ annual launches, and $95B in government spending in 2026.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-stats',
  },
};

export default function SpaceStatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
