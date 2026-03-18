import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why SpaceNexus? - Space Industry Intelligence Platform Comparison | SpaceNexus',
  description:
    'See why SpaceNexus is the best value in space industry intelligence. Compare SpaceNexus ($19.99/mo) vs Quilty Space ($10K+/yr) vs SpaceNews ($250/yr) vs free tools. Real-time data, satellite tracking, company profiles, and more.',
  keywords: [
    'SpaceNexus value proposition',
    'space industry intelligence comparison',
    'quilty analytics alternative',
    'spacenews alternative',
    'space data platform',
    'space industry tools comparison',
    'best space intelligence platform',
    'space market data',
    'satellite tracking platform',
    'space industry subscription',
  ],
  openGraph: {
    title: 'Why SpaceNexus? | SpaceNexus',
    description:
      'Compare SpaceNexus vs Quilty Space vs SpaceNews vs free tools. See why 10,000+ space professionals choose SpaceNexus for real-time space industry intelligence.',
    type: 'website',
    url: 'https://spacenexus.us/why-spacenexus',
    siteName: 'SpaceNexus',
    images: ['/api/og?title=Why%20SpaceNexus&subtitle=Space%20intelligence%20comparison'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Why SpaceNexus? | SpaceNexus',
    description:
      'Compare SpaceNexus vs Quilty Space vs SpaceNews vs free tools. The best value in space industry intelligence.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/why-spacenexus',
  },
};

export default function WhySpaceNexusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
