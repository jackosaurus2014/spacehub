import type { Metadata } from 'next';
import JsonLd, { toolJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Orbital Mechanics Calculator - Delta-V, Period & Escape Velocity',
  description: 'Calculate Hohmann transfer delta-v, orbital periods, escape velocities, and satellite orbital decay. Interactive tools for mission planning with real physics formulas.',
  openGraph: {
    title: 'Orbital Mechanics Calculator - Delta-V, Period & Escape Velocity | SpaceNexus',
    description: 'Calculate Hohmann transfer delta-v, orbital periods, escape velocities, and satellite orbital decay. Interactive tools for mission planning with real physics formulas.',
    type: 'website',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Orbital Mechanics Calculator - Delta-V, Period & Escape Velocity | SpaceNexus',
    description: 'Calculate Hohmann transfer delta-v, orbital periods, escape velocities, and satellite orbital decay. Interactive tools for mission planning with real physics formulas.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/orbital-calculator',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={toolJsonLd({
        name: 'Orbital Mechanics Calculator',
        description: 'Calculate Hohmann transfer delta-v, orbital periods, escape velocities, and satellite orbital decay.',
        url: 'https://spacenexus.us/orbital-calculator',
      })} />
      {children}
    </>
  );
}
