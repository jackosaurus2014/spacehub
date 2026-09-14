import type { Metadata } from 'next';

// CTR pass (2026-09-04): this page is titled for the TABLE intent. The head
// term "blue origin vs spacex" belongs to /guide/blue-origin-vs-spacex, which
// answers the question; this page shows the numbers. The previous title here
// ("2 Launches vs 300+") was also factually stale — New Glenn has flown three
// times — and it was still shipping on Twitter cards because the page's own
// metadata never overrode the twitter block.
// CTR pass (2026-09-14): 80 visible characters before, so the suffix ate the
// end of the phrase. Title now carries the headline number instead of the
// word "Side-by-Side"; description leads with it too.
const TITLE = 'SpaceX vs Blue Origin 2026: 690+ Launches vs 3';
const DESCRIPTION =
  '690+ SpaceX orbital launches against 3 New Glenn flights. Payload, reuse, Starlink vs Amazon Leo, crew, NASA contracts and valuation in one table.';

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
