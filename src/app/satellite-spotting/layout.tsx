import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Spot Satellites: Your Complete Guide',
  description:
    'Learn how to see satellites with the naked eye. Complete guide to spotting the ISS, Starlink trains, Hubble, and more — best times, apps, tips, and photography settings.',
  keywords: [
    'how to see satellites',
    'satellite spotting guide',
    'how to spot ISS',
    'see Starlink satellites',
    'satellite watching',
    'ISS visible tonight',
    'satellites visible tonight',
    'Starlink train visible',
    'satellite photography',
    'space station spotting',
  ],
  openGraph: {
    type: 'article',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'How to Spot Satellites: Your Complete Guide | SpaceNexus',
    description:
      'Learn how to see satellites with the naked eye. Complete guide to spotting the ISS, Starlink trains, Hubble, and more.',
    url: 'https://spacenexus.us/satellite-spotting',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Satellite Spotting Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'How to Spot Satellites: Your Complete Guide | SpaceNexus',
    description:
      'Learn how to see satellites with the naked eye. Complete guide to spotting the ISS, Starlink trains, Hubble, and more.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/satellite-spotting',
  },
};

export default function SatelliteSpottingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
