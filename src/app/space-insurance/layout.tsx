import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Insurance Marketplace',
  description: 'Explore the space insurance market with launch risk data, premium benchmarks, claims history, and underwriter comparisons for satellite and launch coverage.',
  keywords: [
    'space insurance',
    'launch insurance',
    'satellite insurance',
    'space risk',
    'aerospace underwriting',
  ],
  openGraph: {
    title: 'Space Insurance Marketplace | SpaceNexus',
    description: 'Explore the space insurance market with launch risk data and premium benchmarks.',
    url: 'https://spacenexus.us/space-insurance',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Insurance Marketplace | SpaceNexus',
    description: 'Explore the space insurance market with launch risk data and premium benchmarks.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-insurance',
  },
};

export default function SpaceInsuranceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
