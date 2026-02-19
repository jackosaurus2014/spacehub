import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Environment - Solar Weather, Debris & Operations',
  description: 'Monitor space weather conditions, solar flare activity, orbital debris tracking, and space situational awareness. Real-time data from NOAA, NASA, and Space Force.',
  keywords: ['space weather', 'solar flares', 'space debris', 'orbital debris tracker', 'geomagnetic storms', 'space situational awareness', 'Kp index'],
  openGraph: {
    title: 'Space Environment | SpaceNexus',
    description: 'Monitor solar weather, orbital debris, and space operations awareness with real-time data.',
    url: 'https://spacenexus.us/space-environment',
    images: [
      {
        url: '/og-space-environment.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Space Environment - Solar Weather, Debris & Operations',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Environment | SpaceNexus',
    description: 'Monitor solar weather, orbital debris, and space operations awareness with real-time data.',
    images: ['/og-space-environment.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-environment',
  },
};

export default function SpaceEnvironmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
