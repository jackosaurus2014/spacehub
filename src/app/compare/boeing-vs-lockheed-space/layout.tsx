import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boeing Space vs Lockheed Martin Space: Complete Comparison 2026',
  description:
    'Compare Boeing Space and Lockheed Martin Space divisions — defense contracts, revenue, programs, satellites, human spaceflight, and strategic direction.',
  keywords: [
    'Boeing vs Lockheed Martin space',
    'Starliner vs Orion',
    'Boeing Space vs Lockheed Space',
    'defense space contractors',
    'government space comparison',
    'SLS contractors',
    'prime space contractors comparison',
  ],
  openGraph: {
    title: 'Boeing Space vs Lockheed Martin Space: Complete Comparison 2026',
    description:
      'Compare Boeing and Lockheed Martin space divisions side-by-side: Starliner vs Orion, satellite manufacturing, defense contracts, and government space programs.',
    type: 'website',
    url: 'https://spacenexus.us/compare/boeing-vs-lockheed-space',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=Boeing+vs+Lockheed+Space&type=compare',
        width: 1200,
        height: 630,
        alt: 'Boeing vs Lockheed Martin Space Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boeing Space vs Lockheed Martin Space: Complete Comparison 2026',
    description:
      'Compare Boeing and Lockheed Martin space divisions side-by-side: Starliner vs Orion, satellite manufacturing, defense contracts, and government space programs.',
    images: ['/api/og?title=Boeing+vs+Lockheed+Space&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/boeing-vs-lockheed-space',
  },
};

export default function BoeingVsLockheedSpaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
