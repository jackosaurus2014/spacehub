import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Frequency Allocations',
  description: 'Visual reference for RF frequency bands used in space communications with spectrum chart and band comparison.',
  openGraph: {
    title: 'Space Frequency Allocations | SpaceNexus',
    description: 'Visual reference for RF frequency bands used in space communications with spectrum chart and band comparison.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Space Frequency Allocations | SpaceNexus',
    description: 'Visual reference for RF frequency bands used in space communications with spectrum chart and band comparison.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/frequency-bands',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
