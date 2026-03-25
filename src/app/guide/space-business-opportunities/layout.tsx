import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Business Opportunities Guide',
  description: 'Discover business opportunities in the space industry. Government contracts, commercial partnerships, emerging markets, and startup opportunities in aerospace.',
  openGraph: {
    title: 'Space Business Opportunities Guide | SpaceNexus',
    description: 'Discover business opportunities in the space industry. Government contracts, commercial partnerships, and emerging markets.',
    images: [
      {
        url: '/api/og?title=Space+Business+Opportunities+Guide&subtitle=Government+contracts%2C+commercial+partnerships%2C+and+emerging+markets&type=guide',
        width: 1200,
        height: 630,
        alt: 'Space Business Opportunities Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Business Opportunities Guide | SpaceNexus',
    description: 'Government contracts, commercial partnerships, and emerging markets in the space industry.',
    images: ['/api/og?title=Space+Business+Opportunities+Guide&subtitle=Government+contracts%2C+commercial+partnerships%2C+and+emerging+markets&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
