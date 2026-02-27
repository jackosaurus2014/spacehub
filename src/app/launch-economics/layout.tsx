import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Launch Economics Analysis',
  description: 'Comprehensive cost analysis of space launch vehicles. Compare cost per kilogram to LEO, revenue models, market size, and vehicle economics for Falcon 9, Starship, New Glenn, and more.',
  keywords: [
    'space launch economics',
    'cost per kilogram',
    'launch vehicle cost',
    'Falcon 9 cost',
    'Starship economics',
    'space launch market',
    'launch cost comparison',
    'reusability economics',
  ],
  openGraph: {
    title: 'Space Launch Economics Analysis | SpaceNexus',
    description: 'Comprehensive cost analysis of space launch vehicles. Compare cost per kilogram to LEO, revenue models, market size, and vehicle economics.',
    url: 'https://spacenexus.us/launch-economics',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Launch Economics Analysis | SpaceNexus',
    description: 'Comprehensive cost analysis of space launch vehicles. Compare cost per kilogram to LEO, revenue models, market size, and vehicle economics.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/launch-economics',
  },
};

export default function LaunchEconomicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
