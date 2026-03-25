import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Economy Investment Guide',
  description: 'Guide to investing in the space economy. Venture capital trends, public space companies, SPACs, and emerging investment opportunities in aerospace.',
  openGraph: {
    title: 'Space Economy Investment Guide | SpaceNexus',
    description: 'Guide to investing in the space economy. Venture capital trends, public space companies, and emerging investment opportunities.',
    images: [
      {
        url: '/api/og?title=Space+Economy+Investment+Guide&subtitle=Venture+capital+trends%2C+public+space+companies%2C+and+emerging+opportunities&type=guide',
        width: 1200,
        height: 630,
        alt: 'Space Economy Investment Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Economy Investment Guide | SpaceNexus',
    description: 'Venture capital trends, public space companies, and emerging investment opportunities in aerospace.',
    images: ['/api/og?title=Space+Economy+Investment+Guide&subtitle=Venture+capital+trends%2C+public+space+companies%2C+and+emerging+opportunities&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
