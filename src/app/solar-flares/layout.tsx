import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Solar Flare Tracker',
  description: 'Real-time solar activity monitoring and 90-day danger forecasts. Track X-class and M-class solar flares, geomagnetic storms, and space weather impacts on missions.',
  keywords: [
    'solar flares',
    'space weather',
    'solar storms',
    'geomagnetic storms',
    'X-class flare',
    'M-class flare',
    'solar activity',
    'CME coronal mass ejection',
    'aurora forecast',
    'satellite interference',
  ],
  openGraph: {
    title: 'Solar Flare Tracker | SpaceNexus',
    description: 'Real-time solar activity monitoring and 90-day danger forecasts for space missions.',
    url: 'https://spacenexus.com/solar-flares',
    images: [
      {
        url: '/og-solar-flares.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Solar Flare Tracker - Space Weather Monitoring',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solar Flare Tracker | SpaceNexus',
    description: 'Real-time solar activity monitoring and danger forecasts.',
    images: ['/og-solar-flares.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.com/solar-flares',
  },
};

export default function SolarFlaresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
