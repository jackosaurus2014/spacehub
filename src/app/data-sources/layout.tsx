import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Sources | SpaceNexus',
  description:
    'Explore the 30+ data sources SpaceNexus uses to deliver real-time space industry intelligence, including NASA APIs, NOAA, CelesTrak, Finnhub, and 50+ curated RSS feeds.',
  openGraph: {
    title: 'Our Data Sources | SpaceNexus',
    description:
      'Transparency in how SpaceNexus gathers and processes space industry data from government APIs, space agencies, commercial providers, and AI-powered analysis.',
    url: 'https://spacenexus.us/data-sources',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Data Sources | SpaceNexus',
    description:
      'See every data source behind SpaceNexus: NASA, NOAA, ESA, Finnhub, CelesTrak, 50+ RSS feeds, and proprietary AI intelligence.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/data-sources',
  },
};

export default function DataSourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
