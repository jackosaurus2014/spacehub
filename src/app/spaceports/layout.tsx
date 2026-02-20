import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Spaceport Directory',
  description: "Browse the world's launch sites and spaceports. Facility details, launch capabilities, manifest schedules, and deep-space communication networks.",
  keywords: [
    'spaceports',
    'launch sites',
    'Cape Canaveral',
    'Vandenberg',
    'Baikonur',
    'launch facility',
    'space communications',
  ],
  openGraph: {
    title: 'Global Spaceport Directory | SpaceNexus',
    description: "Browse the world's launch sites and spaceports with facility details and launch capabilities.",
    url: 'https://spacenexus.us/spaceports',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Global Spaceport Directory | SpaceNexus',
    description: "Browse the world's launch sites and spaceports with facility details and launch capabilities.",
  },
  alternates: {
    canonical: 'https://spacenexus.us/spaceports',
  },
};

export default function SpaceportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
