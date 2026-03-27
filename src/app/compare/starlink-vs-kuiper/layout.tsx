import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Starlink vs Kuiper: Satellite Internet Comparison | SpaceNexus',
  description:
    'Compare Starlink and Amazon Kuiper side-by-side: satellite counts, coverage areas, latency, pricing, orbital altitudes, and deployment timelines for satellite internet constellations.',
  keywords: [
    'Starlink vs Kuiper',
    'Starlink vs Amazon Kuiper',
    'satellite internet comparison',
    'SpaceX Starlink vs Project Kuiper',
    'LEO broadband comparison',
    'satellite constellation comparison',
    'internet from space',
  ],
  openGraph: {
    title: 'Starlink vs Kuiper: Satellite Internet Comparison | SpaceNexus',
    description:
      'Compare Starlink and Amazon Kuiper side-by-side: satellite counts, coverage areas, latency, pricing, and deployment timelines.',
    type: 'website',
    url: 'https://spacenexus.us/compare/starlink-vs-kuiper',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=Starlink+vs+Kuiper&type=compare',
        width: 1200,
        height: 630,
        alt: 'Starlink vs Kuiper Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starlink vs Kuiper: Satellite Internet Comparison | SpaceNexus',
    description:
      'Compare Starlink and Amazon Kuiper side-by-side: satellite counts, coverage areas, latency, pricing, and deployment timelines.',
    images: ['/api/og?title=Starlink+vs+Kuiper&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/starlink-vs-kuiper',
  },
};

export default function StarlinkVsKuiperLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
