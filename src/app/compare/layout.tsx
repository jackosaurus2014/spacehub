import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SpaceNexus vs Competitors',
    default: 'SpaceNexus Comparison - Bloomberg Terminal, Payload Space, Quilty Analytics Alternatives | SpaceNexus',
  },
  description:
    'See how SpaceNexus compares to Bloomberg Terminal, Payload Space, and Quilty Analytics for space industry intelligence, satellite tracking, and market data.',
  keywords: [
    'SpaceNexus alternative',
    'Bloomberg Terminal space',
    'Payload Space alternative',
    'Quilty Analytics alternative',
    'space industry platform comparison',
    'space intelligence tools',
  ],
  openGraph: {
    title: 'SpaceNexus Comparison - Bloomberg Terminal, Payload Space, Quilty Analytics Alternatives | SpaceNexus',
    description:
      'See how SpaceNexus compares to Bloomberg Terminal, Payload Space, and Quilty Analytics for space industry intelligence, satellite tracking, and market data.',
    type: 'website',
    url: 'https://spacenexus.us/compare',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus Comparison - Bloomberg Terminal, Payload Space, Quilty Analytics Alternatives | SpaceNexus',
    description:
      'See how SpaceNexus compares to Bloomberg Terminal, Payload Space, and Quilty Analytics for space industry intelligence, satellite tracking, and market data.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare',
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
