import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Earth Events from Space',
  description: 'Track natural events visible from space in real time. Wildfires, volcanic eruptions, severe storms, and more from NASA EONET.',
  keywords: [
    'natural events from space',
    'NASA EONET',
    'wildfire satellite tracking',
    'volcano monitoring',
    'severe storm tracking',
    'earth observation',
    'natural disasters space',
    'satellite imagery events',
  ],
  openGraph: {
    title: 'Earth Events from Space | SpaceNexus',
    description: 'Track natural events visible from space — wildfires, volcanoes, severe storms, and more via NASA EONET.',
    url: 'https://spacenexus.us/earth-events',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Earth Events from Space | SpaceNexus',
    description: 'Track natural events visible from space — wildfires, volcanoes, severe storms, and more via NASA EONET.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/earth-events',
  },
};

export default function EarthEventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
