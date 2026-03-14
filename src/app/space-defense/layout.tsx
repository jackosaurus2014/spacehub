import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Defense & National Security',
  description: 'Track global space defense programs, military satellite constellations, and $95B+ in government space spending across 15+ nations.',
  keywords: [
    'space defense',
    'Space Force',
    'military space',
    'counterspace',
    'national security space',
    'space domain awareness',
  ],
  openGraph: {
    title: 'Space Defense & National Security | SpaceNexus',
    description: 'Track global space defense programs, military satellite constellations, and $95B+ in government space spending across 15+ nations.',
    url: 'https://spacenexus.us/space-defense',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Defense & National Security | SpaceNexus',
    description: 'Track global space defense programs, military satellite constellations, and $95B+ in government space spending across 15+ nations.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-defense',
  },
};

export default function SpaceDefenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
