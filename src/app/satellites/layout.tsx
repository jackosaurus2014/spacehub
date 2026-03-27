import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satellite Tracker - Real-Time Orbital Tracking',
  description: 'Track 40,000+ satellites in real-time with SpaceNexus. Monitor Starlink, ISS, and military satellites with 3D visualization and pass predictions.',
  keywords: ['satellite tracker', 'track satellites', 'ISS tracker', 'starlink tracker', 'orbital tracking', 'satellite position', 'space debris tracker', 'satellite pass predictions', 'live satellite tracking', 'satellite map'],
  openGraph: {
    title: 'SpaceNexus Satellite Tracker - 40,000+ Objects',
    description: 'Track 40,000+ satellites in real-time with SpaceNexus. Monitor Starlink, ISS, and military satellites with 3D visualization and pass predictions.',
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
    title: 'SpaceNexus Satellite Tracker - 40,000+ Objects',
    description: 'Track 40,000+ satellites in real-time with SpaceNexus. Monitor Starlink, ISS, and military satellites with 3D visualization and pass predictions.',
    images: ['/og-satellites.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/satellites',
  },
};

export default function SatellitesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
