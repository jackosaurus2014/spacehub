import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Intel',
  description: 'Space industry market intelligence dashboard. Track space stocks, analyze sector trends, and monitor 200+ company valuations in real-time.',
  keywords: [
    'space stocks',
    'space industry stocks',
    'SpaceX valuation',
    'space company IPO',
    'aerospace stocks',
    'satellite company stocks',
    'space market cap',
    'rocket company stocks',
    'space investment',
    'space industry analysis',
  ],
  openGraph: {
    title: 'Market Intel | SpaceNexus',
    description: 'Space industry market intelligence dashboard. Track space stocks, analyze sector trends, and monitor 200+ company valuations in real-time.',
    url: 'https://spacenexus.us/market-intel',
    images: [
      {
        url: '/og-market-intel.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Market Intel - Space Industry Stock Tracker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Market Intel | SpaceNexus',
    description: 'Space industry market intelligence dashboard. Track space stocks, analyze sector trends, and monitor 200+ company valuations in real-time.',
    images: ['/og-market-intel.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/market-intel',
  },
};

export default function MarketIntelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
