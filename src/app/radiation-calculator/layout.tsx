import { Metadata } from 'next';
import JsonLd, { toolJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Space Radiation Environment Calculator',
  description: 'Calculate radiation exposure for spacecraft and astronauts across different orbits. Model trapped radiation, GCR, SPE, and shielding effectiveness.',
  openGraph: {
    title: 'Space Radiation Environment Calculator | SpaceNexus',
    description: 'Calculate radiation exposure for spacecraft and astronauts across different orbits. Model trapped radiation, GCR, SPE, and shielding effectiveness.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Space Radiation Environment Calculator | SpaceNexus',
    description: 'Calculate radiation exposure for spacecraft and astronauts across different orbits. Model trapped radiation, GCR, SPE, and shielding effectiveness.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/radiation-calculator',
  },
};

export default function RadiationCalculatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={toolJsonLd({
        name: 'Space Radiation Environment Calculator',
        description: 'Calculate radiation exposure for spacecraft and astronauts across different orbits. Model trapped radiation, GCR, SPE, and shielding effectiveness.',
        url: 'https://spacenexus.us/radiation-calculator',
      })} />
      {children}
    </>
  );
}
