import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Report: The State of the Space Economy 2026 | SpaceNexus',
  description:
    'Download our comprehensive analysis of the $626 billion space industry. Market sizing, top companies, investment trends, regulatory landscape, and growth projections.',
  keywords: [
    'space economy report 2026',
    'space industry analysis',
    'space market size',
    'space investment trends',
    'space industry growth',
    'commercial space report',
    'space economy forecast',
  ],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Free Report: The State of the Space Economy 2026 | SpaceNexus',
    description:
      'Download our comprehensive analysis of the $626 billion space industry. Market sizing, top companies, investment trends, and growth projections.',
    url: 'https://spacenexus.us/reports/space-economy-2026',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'The State of the Space Economy 2026 - SpaceNexus Report',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Free Report: The State of the Space Economy 2026 | SpaceNexus',
    description:
      'Download our comprehensive analysis of the $626 billion space industry. Market sizing, top companies, investment trends, and growth projections.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/reports/space-economy-2026',
  },
};

export default function SpaceEconomy2026Layout({ children }: { children: React.ReactNode }) {
  return children;
}
