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
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Space Launch Economics Analysis | SpaceNexus',
    description: 'Comprehensive cost analysis of space launch vehicles. Compare cost per kilogram to LEO, revenue models, market size, and vehicle economics.',
    url: 'https://spacenexus.us/launch-economics',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus - Space Launch Economics Analysis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Space Launch Economics Analysis | SpaceNexus',
    description: 'Comprehensive cost analysis of space launch vehicles. Compare cost per kilogram to LEO, revenue models, market size, and vehicle economics.',
    images: ['/og-image.png'],
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
