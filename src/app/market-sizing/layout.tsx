import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Market Sizing & TAM Analysis',
  description: 'Interactive TAM, SAM, and SOM data for 15+ space industry segments with growth projections. Analyze market sizes for satellite services, launch, ground systems, and emerging space sectors.',
  keywords: ['space industry market size', 'space TAM', 'satellite market size', 'launch services market', 'space economy data'],
  openGraph: {
    title: 'SpaceNexus - Space Industry Market Sizing & TAM Analysis',
    description: 'Interactive TAM, SAM, and SOM data for 15+ space industry segments with growth projections. Analyze market sizes for satellite services, launch, ground systems, and emerging space sectors.',
    url: 'https://spacenexus.us/market-sizing',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Industry Market Sizing & TAM Analysis',
    description: 'Interactive TAM, SAM, and SOM data for 15+ space industry segments with growth projections. Analyze market sizes for satellite services, launch, ground systems, and emerging space sectors.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/market-sizing',
  },
};

export default function MarketSizingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
