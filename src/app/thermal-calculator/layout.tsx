import { Metadata } from 'next';
import JsonLd, { toolJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Spacecraft Thermal Analysis Calculator',
  description:
    'Interactive spacecraft thermal analysis tool. Calculate equilibrium temperatures, hot/cold case scenarios, and power balance for any orbit configuration. Evaluate surface coatings, MLI, and thermal control strategies.',
  keywords: [
    'spacecraft thermal analysis',
    'thermal calculator',
    'satellite temperature',
    'equilibrium temperature',
    'solar absorptivity',
    'IR emissivity',
    'thermal control',
    'MLI blankets',
    'spacecraft hot case',
    'spacecraft cold case',
    'Stefan-Boltzmann',
    'orbit thermal environment',
    'spacecraft design tool',
  ],
  openGraph: {
    title: 'Spacecraft Thermal Analysis Calculator | SpaceNexus',
    description:
      'Calculate spacecraft equilibrium temperatures across orbital configurations. Evaluate surface materials, hot/cold case scenarios, and thermal control trade-offs.',
    url: 'https://spacenexus.us/thermal-calculator',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spacecraft Thermal Analysis Calculator | SpaceNexus',
    description:
      'Calculate spacecraft equilibrium temperatures across orbital configurations. Evaluate surface materials, hot/cold case scenarios, and thermal control trade-offs.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/thermal-calculator',
  },
};

export default function ThermalCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={toolJsonLd({
        name: 'Spacecraft Thermal Analysis Calculator',
        description: 'Calculate spacecraft equilibrium temperatures across orbital configurations. Evaluate surface materials and thermal control strategies.',
        url: 'https://spacenexus.us/thermal-calculator',
      })} />
      {children}
    </>
  );
}
