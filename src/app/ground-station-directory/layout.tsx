import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ground Station Network Directory',
  description: 'Comprehensive directory of ground station networks and providers. Compare AWS Ground Station, Azure Orbital, KSAT, SSC, Viasat RTE, Atlas Space Operations, Leaf Space, and RBC Signals.',
  keywords: [
    'ground station directory',
    'satellite ground segment',
    'ground station as a service',
    'GaaS providers',
    'AWS Ground Station',
    'Azure Orbital',
    'KSAT',
    'SSC',
    'satellite downlink',
    'ground station pricing',
  ],
  openGraph: {
    title: 'Ground Station Network Directory | SpaceNexus',
    description: 'Compare ground station networks and providers. Pricing calculator, coverage maps, and detailed provider profiles.',
    url: 'https://spacenexus.us/ground-station-directory',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ground Station Network Directory | SpaceNexus',
    description: 'Compare ground station networks and providers. Pricing calculator, coverage maps, and detailed provider profiles.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/ground-station-directory',
  },
};

export default function GroundStationDirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
