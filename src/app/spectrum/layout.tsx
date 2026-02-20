import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RF Spectrum Management & Auctions',
  description: 'Track radio frequency spectrum allocations for satellite communications. ITU filings, FCC auction results, and band utilization data for space operators.',
  keywords: [
    'RF spectrum space',
    'satellite frequency',
    'ITU filing',
    'FCC spectrum auction',
    'Ka-band',
    'Ku-band',
    'spectrum allocation',
  ],
  openGraph: {
    title: 'RF Spectrum Management & Auctions | SpaceNexus',
    description: 'Track RF spectrum allocations for satellite communications with ITU and FCC data.',
    url: 'https://spacenexus.us/spectrum',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RF Spectrum Management & Auctions | SpaceNexus',
    description: 'Track RF spectrum allocations for satellite communications with ITU and FCC data.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/spectrum',
  },
};

export default function SpectrumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
