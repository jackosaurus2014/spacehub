import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceX vs Arianespace: Falcon 9 vs Ariane 6 on Price, Lift and Cadence (2026)',
  description: 'Falcon 9 lists at about $74M for 22,800 kg to LEO with a reusable booster; Ariane 6 is expendable at roughly $77-115M for 10,300-21,650 kg. Launch record, government customers, sites and what Europe is doing about reuse.',
  keywords: ['SpaceX vs Arianespace', 'Falcon 9 vs Ariane 6', 'launch provider comparison', 'European space launch', 'commercial launch market 2026'],
  openGraph: {
    title: 'SpaceX vs Arianespace: Launch Provider Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of SpaceX and Arianespace — vehicles, pricing, market share, and government customers.',
    url: 'https://spacenexus.us/compare/spacex-vs-arianespace',
    type: 'article',
    images: [{
      url: '/api/og?title=SpaceX+vs+Arianespace&subtitle=Launch+Provider+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'SpaceX vs Arianespace Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceX vs Arianespace: Launch Provider Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of SpaceX and Arianespace — vehicles, pricing, and market dominance.',
    images: ['/api/og?title=SpaceX+vs+Arianespace&subtitle=Launch+Provider+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/spacex-vs-arianespace' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
