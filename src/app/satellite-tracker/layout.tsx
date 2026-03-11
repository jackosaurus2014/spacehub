import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satellite Tracker - Real-Time Orbital Tracking',
  description: 'Track satellites in real-time with SpaceNexus. Monitor orbital positions, TLE data, ISS tracking, Starlink constellation, and space debris with our interactive 2D map.',
  keywords: [
    'satellite tracker',
    'real-time satellite tracking',
    'ISS tracker',
    'Starlink tracker',
    'orbital tracking',
    'TLE data',
    'space debris tracking',
    'satellite positions',
    'LEO satellites',
    'GEO satellites',
  ],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Satellite Tracker - Real-Time Orbital Tracking | SpaceNexus',
    description: 'Track satellites in real-time with interactive maps, TLE data, and orbital analytics.',
    url: 'https://spacenexus.us/satellite-tracker',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Satellite Tracker - Real-Time Orbital Tracking',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Satellite Tracker | SpaceNexus',
    description: 'Track satellites in real-time with interactive maps, TLE data, and orbital analytics.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/satellite-tracker',
  },
};

export default function SatelliteTrackerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
