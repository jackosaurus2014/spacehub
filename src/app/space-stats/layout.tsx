import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Statistics & Facts | SpaceNexus',
  description:
    'Comprehensive space industry statistics: market size ($626B+), launch stats (230+ orbital launches), 10,000+ active satellites, $95B+ government spending, 360,000+ US workforce, and $10B+ annual VC investment. The definitive space economy reference.',
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
    title: 'Space Industry Statistics & Facts | SpaceNexus',
    description:
      'The definitive reference for space industry statistics: $626B market, 230+ annual launches, 10,000+ satellites, 70+ space agencies, and more.',
    url: 'https://spacenexus.us/space-stats',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Statistics & Facts',
    description:
      'Comprehensive space industry statistics: market size, launch data, satellites, government spending, workforce, and investment figures.',
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
