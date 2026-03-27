import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceX vs Blue Origin: Space Industry Comparison | SpaceNexus',
  description:
    'Compare SpaceX and Blue Origin side-by-side: launch vehicles, mission history, pricing, orbital capabilities, and future roadmaps. Data-driven analysis of the top commercial space companies.',
  keywords: [
    'SpaceX vs Blue Origin',
    'Falcon 9 vs New Glenn',
    'Starship vs New Shepard',
    'commercial space comparison',
    'rocket company comparison',
    'Elon Musk vs Jeff Bezos space',
    'launch vehicle comparison',
  ],
  openGraph: {
    title: 'SpaceX vs Blue Origin: Space Industry Comparison | SpaceNexus',
    description:
      'Compare SpaceX and Blue Origin side-by-side: launch vehicles, mission history, pricing, orbital capabilities, and future roadmaps.',
    type: 'website',
    url: 'https://spacenexus.us/compare/spacex-vs-blue-origin',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=SpaceX+vs+Blue+Origin&type=compare',
        width: 1200,
        height: 630,
        alt: 'SpaceX vs Blue Origin Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceX vs Blue Origin: Space Industry Comparison | SpaceNexus',
    description:
      'Compare SpaceX and Blue Origin side-by-side: launch vehicles, mission history, pricing, orbital capabilities, and future roadmaps.',
    images: ['/api/og?title=SpaceX+vs+Blue+Origin&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/spacex-vs-blue-origin',
  },
};

export default function SpaceXVsBlueOriginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
