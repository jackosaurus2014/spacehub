import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare Satellite Constellations',
  description: 'Compare major satellite constellations by orbit type, satellite count, coverage area, data capacity, and operator. Starlink, OneWeb, Kuiper, and more.',
  alternates: {
    canonical: 'https://spacenexus.us/compare/satellites',
  },
  openGraph: {
    title: 'Compare Satellite Constellations | SpaceNexus',
    description: 'Compare major satellite constellations by orbit type, satellite count, coverage area, data capacity, and operator.',
  },
};

export default function CompareSatellitesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
