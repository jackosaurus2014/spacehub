import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Asteroid Watch',
  description: 'Monitor near-Earth asteroids and comets in real time. Close approach data, planetary defense updates, impact risk assessments, and asteroid mining prospects.',
  keywords: [
    'near-Earth asteroids',
    'asteroid tracker',
    'planetary defense',
    'close approach',
    'NEO data',
    'asteroid mining',
    'space rocks',
  ],
  openGraph: {
    title: 'Asteroid Watch | SpaceNexus',
    description: 'Monitor near-Earth asteroids with close approach data and planetary defense updates.',
    url: 'https://spacenexus.us/asteroid-watch',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Asteroid Watch | SpaceNexus',
    description: 'Monitor near-Earth asteroids with close approach data and planetary defense updates.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/asteroid-watch',
  },
};

export default function AsteroidWatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
