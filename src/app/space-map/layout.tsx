import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Ecosystem Map | SpaceNexus',
  description:
    'Interactive map of the space industry organized by sector — launch providers, satellite operators, earth observation, space stations, defense, navigation, ground segment, and in-space services. Explore 29+ key companies and market sizes.',
  openGraph: {
    title: 'Space Industry Ecosystem Map | SpaceNexus',
    description:
      'Explore 8 space industry sectors and 29+ key companies. Market sizes, company profiles, and the full space economy landscape in one interactive view.',
    url: 'https://spacenexus.us/space-map',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-map',
  },
};

export default function SpaceMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
