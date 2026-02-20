import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Defense & National Security',
  description: 'Open-source intelligence on military space programs, Space Force procurement, counterspace threats, allied cooperation, and defense contractor analysis.',
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
    description: 'Open-source intelligence on military space programs, Space Force, and counterspace threats.',
    url: 'https://spacenexus.us/space-defense',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Defense & National Security | SpaceNexus',
    description: 'Open-source intelligence on military space programs, Space Force, and counterspace threats.',
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
