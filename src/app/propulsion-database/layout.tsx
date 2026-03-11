import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Propulsion Systems Database',
  description: 'Comprehensive reference of 33 space propulsion systems with specifications and heritage.',
  openGraph: {
    title: 'Propulsion Systems Database | SpaceNexus',
    description: 'Comprehensive reference of 33 space propulsion systems with specifications and heritage.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Propulsion Systems Database | SpaceNexus',
    description: 'Comprehensive reference of 33 space propulsion systems with specifications and heritage.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/propulsion-database',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
