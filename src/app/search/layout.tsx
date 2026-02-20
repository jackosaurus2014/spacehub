import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search SpaceNexus',
  description: 'Search across news articles, company profiles, satellite data, market intelligence, and procurement opportunities on the SpaceNexus platform.',
  keywords: [
    'space industry search',
    'SpaceNexus search',
    'space data search',
  ],
  openGraph: {
    title: 'Search SpaceNexus | SpaceNexus',
    description: 'Search across news articles, company profiles, satellite data, market intelligence, and procurement opportunities on the SpaceNexus platform.',
    url: 'https://spacenexus.us/search',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Search SpaceNexus | SpaceNexus',
    description: 'Search across news articles, company profiles, satellite data, market intelligence, and procurement opportunities on the SpaceNexus platform.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/search',
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
