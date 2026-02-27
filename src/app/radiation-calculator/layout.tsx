import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Radiation Environment Calculator | SpaceNexus',
  description: 'Calculate radiation exposure for spacecraft and astronauts across different orbits. Model trapped radiation, GCR, SPE, and shielding effectiveness.',
  openGraph: {
    title: 'Space Radiation Environment Calculator | SpaceNexus',
    description: 'Calculate radiation exposure for spacecraft and astronauts across different orbits. Model trapped radiation, GCR, SPE, and shielding effectiveness.',
  },
};

export default function RadiationCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
