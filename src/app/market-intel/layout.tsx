import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Intel',
  description: 'Comprehensive space industry market intelligence. Track stock performance, valuations, funding rounds, and IPO prospects of leading space companies worldwide.',
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
    description: 'Track stock performance, valuations, and funding rounds of leading space companies worldwide.',
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
    description: 'Track stock performance and valuations of leading space companies.',
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
