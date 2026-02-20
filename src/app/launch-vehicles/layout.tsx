import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch Vehicle Database',
  description: 'Compare launch vehicles from SpaceX, ULA, Rocket Lab, Arianespace, and more. Payload capacity, cost per kg, success rates, and upcoming maiden flights.',
  keywords: [
    'launch vehicles',
    'rocket comparison',
    'Falcon 9',
    'Neutron',
    'Ariane 6',
    'New Glenn',
    'Vulcan',
    'rocket specs',
  ],
  openGraph: {
    title: 'Launch Vehicle Database | SpaceNexus',
    description: 'Compare launch vehicles from SpaceX, ULA, Rocket Lab, Arianespace, and more. Payload capacity, cost per kg, success rates, and upcoming maiden flights.',
    url: 'https://spacenexus.us/launch-vehicles',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Launch Vehicle Database | SpaceNexus',
    description: 'Compare launch vehicles from SpaceX, ULA, Rocket Lab, Arianespace, and more. Payload capacity, cost per kg, success rates, and upcoming maiden flights.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/launch-vehicles',
  },
};

export default function LaunchVehiclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
