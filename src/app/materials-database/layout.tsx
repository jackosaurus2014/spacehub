import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Materials Database',
  description: 'Reference of 28 spacecraft materials with properties, temperature ranges, and radiation resistance.',
  openGraph: {
    title: 'Space Materials Database | SpaceNexus',
    description: 'Reference of 28 spacecraft materials with properties, temperature ranges, and radiation resistance.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Space Materials Database | SpaceNexus',
    description: 'Reference of 28 spacecraft materials with properties, temperature ranges, and radiation resistance.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/materials-database',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
