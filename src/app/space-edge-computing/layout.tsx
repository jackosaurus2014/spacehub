import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space-Based Data Processing & Edge Computing',
  description: 'Explore the emerging space-based cloud computing market — in-orbit data centers, edge processing, radiation-hardened processors, and the companies building compute infrastructure in space.',
  keywords: ['space edge computing', 'in-orbit data processing', 'space cloud computing', 'orbital data centers', 'satellite edge computing', 'radiation-hardened processors', 'space-based AI', 'LEO compute'],
  openGraph: {
    title: 'Space-Based Data Processing & Edge Computing | SpaceNexus',
    description: 'Explore the $5.2B space-based cloud computing market — in-orbit data centers, edge processing, and the companies building compute infrastructure in space.',
    url: 'https://spacenexus.us/space-edge-computing',
    images: [
      {
        url: '/og-space-edge-computing.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Space-Based Data Processing & Edge Computing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space-Based Data Processing & Edge Computing | SpaceNexus',
    description: 'Explore the $5.2B space-based cloud computing market — in-orbit data centers, edge processing, and compute infrastructure in space.',
    images: ['/og-space-edge-computing.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-edge-computing',
  },
};

export default function SpaceEdgeComputingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
