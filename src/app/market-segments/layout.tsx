import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Market Segments Analysis',
  description: 'Explore the $546B global space economy broken into 12 investable market segments with market sizes, growth rates, key players, treemap visualization, and growth matrix.',
  keywords: [
    'space market segments',
    'space industry analysis',
    'space economy sectors',
    'satellite communications market',
    'launch services market',
    'space investment sectors',
    'space market size',
    'space CAGR',
  ],
  openGraph: {
    title: 'Space Industry Market Segments Analysis | SpaceNexus',
    description: 'Explore the $546B global space economy broken into 12 investable market segments with growth rates, key players, and visualizations.',
    url: 'https://spacenexus.us/market-segments',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Market Segments Analysis | SpaceNexus',
    description: 'Explore the $546B global space economy broken into 12 investable market segments with growth rates, key players, and visualizations.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/market-segments',
  },
};

export default function MarketSegmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
