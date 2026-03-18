import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aurora Forecast & Space Weather for Enthusiasts',
  description:
    'Real-time aurora forecast with Kp index, geomagnetic activity, and visibility map. Learn when and where to see the Northern Lights during Solar Cycle 25.',
  keywords: [
    'aurora forecast',
    'northern lights forecast',
    'aurora borealis forecast',
    'kp index',
    'aurora tonight',
    'northern lights tonight',
    'geomagnetic storm',
    'solar storm aurora',
    'aurora viewing guide',
    'space weather forecast',
  ],
  openGraph: {
    type: 'article',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Aurora Forecast & Space Weather for Enthusiasts | SpaceNexus',
    description:
      'Real-time aurora forecast with Kp index, geomagnetic activity, and visibility guide. See when the Northern Lights will be visible near you.',
    url: 'https://spacenexus.us/aurora-forecast',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Aurora Forecast & Space Weather Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Aurora Forecast & Space Weather for Enthusiasts | SpaceNexus',
    description:
      'Real-time aurora forecast with Kp index, geomagnetic activity, and visibility guide.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/aurora-forecast',
  },
};

export default function AuroraForecastLayout({ children }: { children: React.ReactNode }) {
  return children;
}
