import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iridium vs Starlink 2026: 66 vs 6,000+ Sats',
  description: 'Iridium\'s 66-satellite L-band network vs Starlink\'s 6,000+ satellite broadband constellation — coverage, latency, pricing, and use cases compared for 2026.',
  keywords: ['Iridium vs Starlink', 'satellite internet comparison', 'LEO satellite connectivity', 'Iridium NEXT', 'Starlink broadband', 'satellite IoT 2026'],
  openGraph: {
    title: 'Iridium vs Starlink 2026: 66 vs 6,000+ Sats',
    description: 'Iridium\'s 66-satellite L-band network vs Starlink\'s 6,000+ satellite broadband constellation — coverage, latency, pricing, and use cases compared for 2026.',
    url: 'https://spacenexus.us/compare/iridium-vs-starlink',
    type: 'article',
    images: [{
      url: '/api/og?title=Iridium+vs+Starlink&subtitle=Satellite+Connectivity+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Iridium vs Starlink Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Iridium vs Starlink 2026: 66 vs 6,000+ Sats',
    description: 'Iridium\'s 66-satellite L-band network vs Starlink\'s 6,000+ satellite broadband constellation, compared for 2026.',
    images: ['/api/og?title=Iridium+vs+Starlink&subtitle=Satellite+Connectivity+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/iridium-vs-starlink' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
