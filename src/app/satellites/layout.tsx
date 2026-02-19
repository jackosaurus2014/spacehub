import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satellite Tracker - Real-Time Orbital Tracking',
  description: 'Track 19,000+ satellites in real time on an interactive 3D globe. Monitor ISS, Starlink, debris, and constellations. Get pass predictions and orbital data.',
  keywords: ['satellite tracker', 'ISS tracker', 'Starlink tracker', 'orbital tracking', 'satellite position', 'space debris tracker'],
  openGraph: {
    title: 'SpaceNexus Satellite Tracker - 19,000+ Objects',
    description: 'Real-time satellite tracking on an interactive 3D globe with pass predictions and orbital data.',
    url: 'https://spacenexus.us/satellites',
    images: [
      {
        url: '/og-satellites.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Satellite Tracker - Track 19,000+ Objects in Orbit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus Satellite Tracker - 19,000+ Objects',
    description: 'Real-time satellite tracking on an interactive 3D globe with pass predictions and orbital data.',
    images: ['/og-satellites.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/satellites',
  },
};

export default function SatellitesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
