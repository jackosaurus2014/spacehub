import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planet Labs vs Maxar (Vantor / Lanteris): Complete Comparison 2026',
  description:
    'Compare Planet Labs (PL) and the former Maxar Technologies — now split into Vantor (Earth observation/intelligence) and Lanteris Space Systems (satellite manufacturing) — side by side: constellation size, resolution, revenue, customers, data products, and business model.',
  keywords: [
    'Planet Labs vs Maxar',
    'earth observation comparison',
    'satellite imagery comparison',
    'Planet Dove vs WorldView',
    'geospatial intelligence',
    'remote sensing comparison',
    'earth imaging satellites',
  ],
  openGraph: {
    title: 'Planet Labs vs Maxar (Vantor / Lanteris): Complete Comparison 2026',
    description:
      'Compare Planet Labs and Maxar side-by-side: satellite fleets, imaging resolution, revisit rates, data products, and geospatial intelligence capabilities.',
    type: 'website',
    url: 'https://spacenexus.us/compare/planet-labs-vs-maxar',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=Planet+Labs+vs+Maxar&type=compare',
        width: 1200,
        height: 630,
        alt: 'Planet Labs vs Maxar Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Planet Labs vs Maxar (Vantor / Lanteris): Complete Comparison 2026',
    description:
      'Compare Planet Labs and Maxar side-by-side: satellite fleets, imaging resolution, revisit rates, data products, and geospatial intelligence capabilities.',
    images: ['/api/og?title=Planet+Labs+vs+Maxar&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/planet-labs-vs-maxar',
  },
};

export default function PlanetLabsVsMaxarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
