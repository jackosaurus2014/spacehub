import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satellite Bus Comparison',
  description: 'Compare satellite bus platforms from Ball Aerospace, Airbus, Maxar, Boeing, Northrop Grumman, and more. Mass, power, orbit, payload capacity, and cost estimates for small, medium, and large satellite buses.',
  keywords: [
    'satellite bus',
    'satellite platform',
    'spacecraft bus comparison',
    'Ball BCP-100',
    'Airbus Eurostar Neo',
    'Maxar 1300',
    'Boeing 702',
    'satellite procurement',
    'bus selection',
  ],
  openGraph: {
    title: 'Satellite Bus Comparison | SpaceNexus',
    description: 'Compare satellite bus platforms from Ball Aerospace, Airbus, Maxar, Boeing, Northrop Grumman, and more. Mass, power, orbit, payload capacity, and cost estimates.',
    url: 'https://spacenexus.us/satellite-bus-comparison',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Satellite Bus Comparison | SpaceNexus',
    description: 'Compare satellite bus platforms from Ball Aerospace, Airbus, Maxar, Boeing, Northrop Grumman, and more.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/satellite-bus-comparison',
  },
};

export default function SatelliteBusComparisonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
