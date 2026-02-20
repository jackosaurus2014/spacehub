import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mars Mission Planner',
  description: 'Plan Mars missions with transfer window calculations, delta-v budgets, EDL analysis, and surface operation planning. Tools for mission architects and researchers.',
  keywords: [
    'Mars mission',
    'Mars transfer window',
    'Mars colonization',
    'Mars delta-v',
    'Mars EDL',
    'Starship Mars',
  ],
  openGraph: {
    title: 'Mars Mission Planner | SpaceNexus',
    description: 'Plan Mars missions with transfer window calculations and delta-v budgets.',
    url: 'https://spacenexus.us/mars-planner',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mars Mission Planner | SpaceNexus',
    description: 'Plan Mars missions with transfer window calculations and delta-v budgets.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/mars-planner',
  },
};

export default function MarsPlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
