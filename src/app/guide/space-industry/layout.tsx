import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Overview Guide',
  description: 'Comprehensive overview of the global space industry. Key sectors, major players, market trends, and the future of commercial space.',
  openGraph: {
    title: 'Space Industry Overview Guide | SpaceNexus',
    description: 'Comprehensive overview of the global space industry. Key sectors, major players, market trends, and the future of commercial space.',
    images: [
      {
        url: '/api/og?title=Space+Industry+Overview+Guide&subtitle=Key+sectors%2C+major+players%2C+market+trends%2C+and+the+future+of+commercial+space&type=guide',
        width: 1200,
        height: 630,
        alt: 'Space Industry Overview Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Overview Guide | SpaceNexus',
    description: 'Comprehensive overview of the global space industry. Key sectors, major players, and market trends.',
    images: ['/api/og?title=Space+Industry+Overview+Guide&subtitle=Key+sectors%2C+major+players%2C+market+trends%2C+and+the+future+of+commercial+space&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
