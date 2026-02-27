import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Mission Simulator | SpaceNexus',
  description:
    'Plan and simulate space missions with real vehicle data. Calculate delta-V, costs, timelines, and compare launch vehicles for LEO, GEO, lunar, and interplanetary missions.',
  keywords: [
    'space mission simulator',
    'mission planner',
    'delta-v calculator',
    'launch vehicle comparison',
    'mission cost estimate',
    'rocket equation',
    'orbital mechanics',
    'space mission timeline',
  ],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Space Mission Simulator | SpaceNexus',
    description:
      'Plan and simulate space missions with real vehicle data. Calculate delta-V, costs, timelines, and compare launch vehicles for LEO, GEO, lunar, and interplanetary missions.',
    url: 'https://spacenexus.us/mission-simulator',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus - Space Mission Simulator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Space Mission Simulator | SpaceNexus',
    description:
      'Plan and simulate space missions with real vehicle data. Calculate delta-V, costs, timelines, and compare launch vehicles for LEO, GEO, lunar, and interplanetary missions.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/mission-simulator',
  },
};

export default function MissionSimulatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
