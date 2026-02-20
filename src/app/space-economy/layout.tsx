import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Economy Data & Trends',
  description: 'Analyze the $630B+ space economy with market size data, sector breakdowns, growth projections, and economic indicators across the global space industry.',
  keywords: [
    'space economy',
    'space market size',
    'space industry revenue',
    'space GDP',
    'space sector growth',
    'aerospace market',
  ],
  openGraph: {
    title: 'Space Economy Data & Trends | SpaceNexus',
    description: 'Analyze the $630B+ space economy with market data, sector breakdowns, and growth projections.',
    url: 'https://spacenexus.us/space-economy',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Economy Data & Trends | SpaceNexus',
    description: 'Analyze the $630B+ space economy with market data, sector breakdowns, and growth projections.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-economy',
  },
};

export default function SpaceEconomyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
