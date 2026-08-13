import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Asteroid Watch: Tracking 34,500+ NEOs (2026)',
  description: 'Track 34,500+ near-Earth objects in real time, with close approach data, Sentry impact risk scores, asteroid composition, and planetary defense updates for 2026.',
  keywords: [
    'asteroid watch',
    'sentry asteroid tracker',
    'near-Earth asteroids',
    'asteroid tracker',
    'planetary defense',
    'close approach',
    'NEO data',
    'asteroid mining',
    'space rocks',
  ],
  openGraph: {
    title: 'Asteroid Watch: Tracking 34,500+ NEOs (2026)',
    description: 'Track 34,500+ near-Earth objects in real time, with close approach data, Sentry impact risk scores, and planetary defense updates.',
    url: 'https://spacenexus.us/asteroid-watch',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Asteroid Watch: Tracking 34,500+ NEOs (2026)',
    description: 'Track 34,500+ near-Earth objects in real time, with close approach data, Sentry impact risk scores, and planetary defense updates.',
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
