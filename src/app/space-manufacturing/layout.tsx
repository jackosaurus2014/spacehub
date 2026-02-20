import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'In-Space Manufacturing Intelligence',
  description: 'Explore in-space manufacturing and microgravity production. Track companies, missions, and market data for space-based pharmaceuticals, materials, and optics.',
  keywords: [
    'in-space manufacturing',
    'microgravity production',
    'space factory',
    'Varda Space',
    'space materials',
  ],
  openGraph: {
    title: 'In-Space Manufacturing Intelligence | SpaceNexus',
    description: 'Explore in-space manufacturing and microgravity production capabilities.',
    url: 'https://spacenexus.us/space-manufacturing',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'In-Space Manufacturing Intelligence | SpaceNexus',
    description: 'Explore in-space manufacturing and microgravity production capabilities.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-manufacturing',
  },
};

export default function SpaceManufacturingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
