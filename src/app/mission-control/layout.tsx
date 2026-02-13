import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mission Control',
  description: 'Track upcoming space missions, rocket launches, crewed expeditions, and satellite deployments. Explore 5 years of planned space events from agencies worldwide.',
  keywords: [
    'space missions',
    'rocket launches',
    'SpaceX launches',
    'NASA missions',
    'satellite deployments',
    'crewed missions',
    'moon missions',
    'mars missions',
    'space station',
    'launch schedule',
  ],
  openGraph: {
    title: 'Mission Control | SpaceNexus',
    description: 'Track upcoming space missions, rocket launches, crewed expeditions, and satellite deployments from agencies worldwide.',
    url: 'https://spacenexus.us/mission-control',
    images: [
      {
        url: '/og-mission-control.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Mission Control - Track Space Launches',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mission Control | SpaceNexus',
    description: 'Track upcoming space missions, rocket launches, and satellite deployments.',
    images: ['/og-mission-control.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/mission-control',
  },
};

export default function MissionControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
