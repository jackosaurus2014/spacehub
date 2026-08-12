import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satellite Tracker - Real-Time Orbital Tracking',
  description: 'Track satellites in real-time with SpaceNexus. Monitor the ISS, Starlink, GPS, and weather satellites with live TLE-based positions on an interactive orbital map.',
  keywords: ['satellite tracker', 'track satellites', 'real-time satellite tracking', 'ISS tracker', 'starlink tracker', 'orbital tracking', 'TLE data', 'satellite position', 'space debris tracker', 'live satellite tracking', 'satellite map', 'LEO satellites', 'GEO satellites'],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Satellite Tracker - Real-Time Orbital Tracking | SpaceNexus',
    description: 'Track satellites in real-time with SpaceNexus. Monitor the ISS, Starlink, GPS, and weather satellites with live TLE-based positions on an interactive orbital map.',
    url: 'https://spacenexus.us/satellites',
    images: [
      {
        url: '/og-satellites.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Satellite Tracker - Track 40,000+ Objects in Orbit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Satellite Tracker | SpaceNexus',
    description: 'Track satellites in real-time with live TLE-based positions, interactive maps, and orbital analytics.',
    images: ['/og-satellites.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/satellites',
  },
};

export default function SatellitesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
