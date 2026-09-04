import type { Metadata } from 'next';

// CTR pass (2026-09-04): this page is titled for the TABLE intent. The head
// term "blue origin vs spacex" belongs to /guide/blue-origin-vs-spacex, which
// answers the question; this page shows the numbers. The previous title here
// ("2 Launches vs 300+") was also factually stale — New Glenn has flown three
// times — and it was still shipping on Twitter cards because the page's own
// metadata never overrode the twitter block.
const TITLE = 'SpaceX vs Blue Origin: Side-by-Side Comparison Table (2026)';
const DESCRIPTION =
  'Every key number in one table — orbital launches, reusability, payload to LEO, Starlink vs Amazon Leo, crewed flights, NASA contracts, funding and valuation — with live figures. For the full analysis, read our Blue Origin vs SpaceX guide.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'SpaceX vs Blue Origin',
    'SpaceX vs Blue Origin comparison table',
    'Falcon 9 vs New Glenn',
    'Starship vs New Glenn',
    'commercial space comparison',
    'rocket company comparison',
    'Elon Musk vs Jeff Bezos space',
    'launch vehicle comparison',
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    url: 'https://spacenexus.us/compare/spacex-vs-blue-origin',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=SpaceX+vs+Blue+Origin&type=compare',
        width: 1200,
        height: 630,
        alt: 'SpaceX vs Blue Origin comparison table',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/api/og?title=SpaceX+vs+Blue+Origin&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/spacex-vs-blue-origin',
  },
};

export default function SpaceXVsBlueOriginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
