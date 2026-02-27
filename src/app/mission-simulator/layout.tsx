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
    title: 'Space Mission Simulator | SpaceNexus',
    description:
      'Plan and simulate space missions with real vehicle data. Calculate delta-V, costs, timelines, and compare launch vehicles for LEO, GEO, lunar, and interplanetary missions.',
    url: 'https://spacenexus.us/mission-simulator',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Mission Simulator | SpaceNexus',
    description:
      'Plan and simulate space missions with real vehicle data. Calculate delta-V, costs, timelines, and compare launch vehicles for LEO, GEO, lunar, and interplanetary missions.',
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
