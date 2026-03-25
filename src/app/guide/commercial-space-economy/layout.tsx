import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Commercial Space Economy Guide',
  description: 'In-depth guide to the commercial space economy. Market dynamics, key players, revenue streams, and emerging business models in the space sector.',
  openGraph: {
    title: 'Commercial Space Economy Guide | SpaceNexus',
    description: 'In-depth guide to the commercial space economy. Market dynamics, key players, revenue streams, and emerging business models.',
    images: [
      {
        url: '/api/og?title=Commercial+Space+Economy+Guide&subtitle=Market+dynamics%2C+key+players%2C+revenue+streams%2C+and+emerging+business+models&type=guide',
        width: 1200,
        height: 630,
        alt: 'Commercial Space Economy Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Commercial Space Economy Guide | SpaceNexus',
    description: 'Market dynamics, key players, revenue streams, and emerging business models in the space sector.',
    images: ['/api/og?title=Commercial+Space+Economy+Guide&subtitle=Market+dynamics%2C+key+players%2C+revenue+streams%2C+and+emerging+business+models&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
