import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceX vs Arianespace: Launch Provider Comparison 2026',
  description: 'Compare SpaceX and Arianespace side by side — Falcon 9/Heavy vs Ariane 6, market share, pricing, government customers, and launch cadence. Updated 2026 data.',
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
