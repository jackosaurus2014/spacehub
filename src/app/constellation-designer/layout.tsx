import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Constellation Designer | SpaceNexus',
  description: 'Design satellite constellations with Walker formulas, coverage analysis, and cost estimation.',
  openGraph: {
    title: 'Constellation Designer | SpaceNexus',
    description: 'Design satellite constellations with Walker formulas, coverage analysis, and cost estimation.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Constellation Designer | SpaceNexus',
    description: 'Design satellite constellations with Walker formulas, coverage analysis, and cost estimation.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/constellation-designer',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
