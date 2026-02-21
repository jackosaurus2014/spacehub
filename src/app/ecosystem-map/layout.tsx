import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Ecosystem Map | Value Chain & Company Directory',
  description:
    'Interactive map of the space industry value chain. Explore upstream suppliers, launch providers, satellite operators, and downstream applications. See how 100+ companies connect across the space economy.',
  keywords: [
    'space industry ecosystem',
    'space value chain',
    'space industry map',
    'satellite industry structure',
    'space economy companies',
    'launch providers',
    'satellite manufacturers',
    'space industry segments',
    'commercial space ecosystem',
    'aerospace supply chain',
  ],
  openGraph: {
    title: 'Space Industry Ecosystem Map | SpaceNexus',
    description:
      'Interactive visual map of the space industry value chain. Explore upstream, midstream, downstream, and cross-cutting segments.',
    url: 'https://spacenexus.us/ecosystem-map',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Space Industry Ecosystem Map' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Ecosystem Map | SpaceNexus',
    description:
      'Interactive visual map of the space industry value chain with 100+ companies.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/ecosystem-map',
  },
};

export default function EcosystemMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
