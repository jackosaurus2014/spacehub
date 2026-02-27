import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satellite Tracking Guide | SpaceNexus',
  description: 'Learn how to track satellites with this comprehensive guide. TLE data, orbital mechanics basics, tracking tools, and real-time monitoring techniques.',
  openGraph: {
    title: 'Satellite Tracking Guide | SpaceNexus',
    description: 'Learn how to track satellites with this comprehensive guide. TLE data, orbital mechanics basics, and tracking tools.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
