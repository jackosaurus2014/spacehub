import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blue Origin vs SpaceX 2026: 2 Launches vs 300+',
  description:
    'SpaceX has flown 300+ orbital missions; Blue Origin\'s New Glenn has flown 2. Compare launch vehicles, payload capacity, reusability, and roadmaps for 2026.',
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
    title: 'Blue Origin vs SpaceX 2026: 2 Launches vs 300+',
    description:
      'SpaceX has flown 300+ orbital missions; Blue Origin\'s New Glenn has flown 2. Compare launch vehicles, payload capacity, reusability, and roadmaps for 2026.',
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
    title: 'Blue Origin vs SpaceX 2026: 2 Launches vs 300+',
    description:
      'SpaceX has flown 300+ orbital missions; Blue Origin\'s New Glenn has flown 2. Compare launch vehicles, payload capacity, reusability, and roadmaps for 2026.',
    images: ['/api/og?title=SpaceX+vs+Blue+Origin&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/spacex-vs-blue-origin',
  },
};

export default function SpaceXVsBlueOriginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
