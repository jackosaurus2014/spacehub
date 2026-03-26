import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Firefly Aerospace vs ABL Space Systems: Small Launch Comparison 2026',
  description: 'Compare Firefly Aerospace and ABL Space Systems — Alpha vs RS1, small launch market positioning, government contracts, and development struggles. Updated 2026.',
  keywords: ['Firefly vs ABL Space', 'Firefly Alpha', 'ABL RS1', 'small launch comparison', 'small satellite launch 2026'],
  openGraph: {
    title: 'Firefly Aerospace vs ABL Space Systems: Small Launch Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Firefly Alpha and ABL RS1 — two small launch vehicles with very different trajectories.',
    url: 'https://spacenexus.us/compare/firefly-vs-abl-space',
    type: 'article',
    images: [{
      url: '/api/og?title=Firefly+vs+ABL+Space&subtitle=Small+Launch+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Firefly vs ABL Space Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Firefly Aerospace vs ABL Space Systems: Small Launch Comparison 2026 | SpaceNexus',
    description: 'Firefly Alpha vs ABL RS1 — diverging paths in the small launch market.',
    images: ['/api/og?title=Firefly+vs+ABL+Space&subtitle=Small+Launch+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/firefly-vs-abl-space' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
