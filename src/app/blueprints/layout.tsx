import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mission Blueprint Library',
  description: 'Browse curated mission blueprints and reference architectures for satellite deployment, lunar missions, space stations, and deep-space exploration.',
  keywords: [
    'mission blueprint',
    'mission architecture',
    'space mission design',
    'mission planning template',
  ],
  openGraph: {
    title: 'Mission Blueprint Library | SpaceNexus',
    description: 'Browse curated mission blueprints and reference architectures for satellite deployment, lunar missions, space stations, and deep-space exploration.',
    url: 'https://spacenexus.us/blueprints',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mission Blueprint Library | SpaceNexus',
    description: 'Browse curated mission blueprints and reference architectures for satellite deployment, lunar missions, space stations, and deep-space exploration.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/blueprints',
  },
};

export default function BlueprintsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
