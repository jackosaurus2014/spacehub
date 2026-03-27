import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boeing vs Lockheed Martin Space: Industry Comparison | SpaceNexus',
  description:
    'Compare Boeing and Lockheed Martin space divisions side-by-side: Starliner vs Orion, satellite manufacturing, defense contracts, SLS contributions, and government space programs.',
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
    title: 'Boeing vs Lockheed Martin Space: Industry Comparison | SpaceNexus',
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
    title: 'Boeing vs Lockheed Martin Space: Industry Comparison | SpaceNexus',
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
