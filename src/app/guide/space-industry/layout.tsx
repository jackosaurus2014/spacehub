import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Guide to the Space Industry 2026 | Markets, Tech & Opportunities',
  description: 'Comprehensive guide to the $626B+ space industry. Learn about market size, key companies, government programs, emerging trends, careers, and investment opportunities in space.',
  openGraph: {
    title: 'Space Industry Overview Guide | SpaceNexus',
    description: 'Comprehensive guide to the $626B+ space industry. Learn about market size, key companies, government programs, emerging trends, careers, and investment opportunities in space.',
    images: [
      {
        url: '/api/og?title=Space+Industry+Overview+Guide&subtitle=Key+sectors%2C+major+players%2C+market+trends%2C+and+the+future+of+commercial+space&type=guide',
        width: 1200,
        height: 630,
        alt: 'Complete Guide to the Space Industry 2026 | Markets, Tech & Opportunities',
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
