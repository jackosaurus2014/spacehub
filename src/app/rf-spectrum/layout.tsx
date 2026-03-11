import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RF Spectrum Visualization',
  description:
    'Interactive visualization of radio frequency spectrum allocations for space communications. Explore band details, link budgets, regulatory regions, and emerging spectrum trends.',
  keywords: [
    'RF spectrum',
    'satellite frequency bands',
    'Ka-band',
    'Ku-band',
    'C-band',
    'spectrum allocation',
    'ITU radio regulations',
    'link budget',
    'rain fade',
    'space communications',
  ],
  openGraph: {
    title: 'RF Spectrum Visualization | SpaceNexus',
    description:
      'Interactive visualization of radio frequency spectrum allocations for space communications.',
    url: 'https://spacenexus.us/rf-spectrum',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RF Spectrum Visualization | SpaceNexus',
    description:
      'Interactive visualization of radio frequency spectrum allocations for space communications.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/rf-spectrum',
  },
};

export default function RFSpectrumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
