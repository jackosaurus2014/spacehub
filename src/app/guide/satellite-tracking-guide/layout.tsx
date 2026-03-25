import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satellite Tracking Guide',
  description: 'Learn how to track satellites with this comprehensive guide. TLE data, orbital mechanics basics, tracking tools, and real-time monitoring techniques.',
  openGraph: {
    title: 'Satellite Tracking Guide | SpaceNexus',
    description: 'Learn how to track satellites with this comprehensive guide. TLE data, orbital mechanics basics, and tracking tools.',
    images: [
      {
        url: '/api/og?title=Satellite+Tracking+Guide&subtitle=TLE+data%2C+orbital+mechanics+basics%2C+and+real-time+tracking+tools&type=guide',
        width: 1200,
        height: 630,
        alt: 'Satellite Tracking Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Satellite Tracking Guide | SpaceNexus',
    description: 'Learn how to track satellites. TLE data, orbital mechanics basics, and tracking tools.',
    images: ['/api/og?title=Satellite+Tracking+Guide&subtitle=TLE+data%2C+orbital+mechanics+basics%2C+and+real-time+tracking+tools&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
