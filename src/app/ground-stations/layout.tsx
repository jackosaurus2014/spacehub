import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ground Station Network Map',
  description: 'Explore global ground station networks for satellite communications. Interactive map with locations, antenna specs, frequency bands, and service capabilities.',
  keywords: [
    'ground station',
    'satellite ground segment',
    'antenna network',
    'satellite downlink',
    'AWS Ground Station',
  ],
  openGraph: {
    title: 'Ground Station Network Map | SpaceNexus',
    description: 'Explore global ground station networks for satellite communications.',
    url: 'https://spacenexus.us/ground-stations',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ground Station Network Map | SpaceNexus',
    description: 'Explore global ground station networks for satellite communications.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/ground-stations',
  },
};

export default function GroundStationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
