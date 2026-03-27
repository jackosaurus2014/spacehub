import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Virgin Galactic vs Blue Origin: Space Tourism Comparison | SpaceNexus',
  description:
    'Compare Virgin Galactic and Blue Origin space tourism side-by-side: ticket prices, flight experience, altitude reached, vehicle design, safety records, and booking availability.',
  keywords: [
    'Virgin Galactic vs Blue Origin',
    'space tourism comparison',
    'SpaceShipTwo vs New Shepard',
    'suborbital spaceflight comparison',
    'space tourism pricing',
    'commercial spaceflight comparison',
    'space tourism 2026',
  ],
  openGraph: {
    title: 'Virgin Galactic vs Blue Origin: Space Tourism Comparison | SpaceNexus',
    description:
      'Compare Virgin Galactic and Blue Origin space tourism side-by-side: ticket prices, flight experience, altitude reached, vehicle design, and booking availability.',
    type: 'website',
    url: 'https://spacenexus.us/compare/virgin-galactic-vs-blue-origin',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=Virgin+Galactic+vs+Blue+Origin&type=compare',
        width: 1200,
        height: 630,
        alt: 'Virgin Galactic vs Blue Origin Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Virgin Galactic vs Blue Origin: Space Tourism Comparison | SpaceNexus',
    description:
      'Compare Virgin Galactic and Blue Origin space tourism side-by-side: ticket prices, flight experience, altitude reached, vehicle design, and booking availability.',
    images: ['/api/og?title=Virgin+Galactic+vs+Blue+Origin&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/virgin-galactic-vs-blue-origin',
  },
};

export default function VirginGalacticVsBlueOriginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
