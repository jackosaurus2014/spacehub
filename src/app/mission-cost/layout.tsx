import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mission Planning - Launch Cost Estimation & Analysis',
  description: 'Plan space missions with detailed cost estimation, launch vehicle comparison, insurance analysis, and orbital mechanics tools. Compare costs across providers like SpaceX, Rocket Lab, and ULA.',
  keywords: ['launch cost', 'mission planning', 'space insurance', 'launch vehicle comparison', 'orbital costs', 'rocket cost estimator'],
  openGraph: {
    title: 'Mission Planning | SpaceNexus',
    description: 'Plan space missions with cost estimation, launch vehicle comparison, and insurance analysis tools.',
    url: 'https://spacenexus.us/mission-cost',
    images: [
      {
        url: '/og-mission-planning.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Mission Planning - Launch Cost Estimation & Analysis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mission Planning | SpaceNexus',
    description: 'Plan space missions with cost estimation, launch vehicle comparison, and insurance analysis tools.',
    images: ['/og-mission-planning.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/mission-cost',
  },
};

export default function MissionCostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
