import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'Connect SpaceNexus with your workflow. API integrations, data feeds, and third-party tool connections.',
  alternates: {
    canonical: 'https://spacenexus.us/integrations',
  },
  openGraph: {
    title: 'Integrations & Data Sources | SpaceNexus',
    description: 'SpaceNexus integrates with 50+ data sources including NASA, SpaceX, NOAA, CelesTrak, and more.',
    images: [{ url: '/api/og?title=Integrations&type=data', width: 1200, height: 630, alt: 'Integrations' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Integrations & Data Sources | SpaceNexus',
    description: 'SpaceNexus integrates with 50+ data sources including NASA, SpaceX, NOAA, CelesTrak, and more.',
    images: ['/api/og?title=Integrations&type=data'],
  },
};

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
