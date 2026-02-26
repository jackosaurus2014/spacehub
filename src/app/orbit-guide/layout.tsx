import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Orbit Types Guide | SpaceNexus',
  description: 'Educational guide to orbital mechanics covering LEO, MEO, GEO, HEO, and deep space orbits.',
  openGraph: {
    title: 'Orbit Types Guide | SpaceNexus',
    description: 'Educational guide to orbital mechanics covering LEO, MEO, GEO, HEO, and deep space orbits.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
