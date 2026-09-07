import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investing in the Space Economy: Complete 2026 Guide',
  description: 'Comprehensive guide to investing in the space economy. Covers public space stocks, ETFs, venture capital, SPAC lessons, company evaluation metrics, and emerging investment themes for 2026-2030.',
  openGraph: {
    title: 'Space Economy Investment Guide | SpaceNexus',
    description: 'Guide to investing in the space economy. Venture capital trends, public space companies, and emerging investment opportunities.',
    images: [
      {
        url: '/api/og?title=Space+Economy+Investment+Guide&subtitle=Venture+capital+trends%2C+public+space+companies%2C+and+emerging+opportunities&type=guide',
        width: 1200,
        height: 630,
        alt: 'Investing in the Space Economy: Complete 2026 Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Economy Investment Guide | SpaceNexus',
    description: 'Venture capital trends, public space companies, and emerging investment opportunities in aerospace.',
    images: ['/api/og?title=Space+Economy+Investment+Guide&subtitle=Venture+capital+trends%2C+public+space+companies%2C+and+emerging+opportunities&type=guide'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-economy-investment',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
